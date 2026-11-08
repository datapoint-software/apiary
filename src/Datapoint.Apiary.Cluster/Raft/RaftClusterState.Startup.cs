using System.Net;
using System.Security.Cryptography;
using Datapoint.Apiary.Cluster.Join;
using Datapoint.Apiary.Cluster.Projects;
using Datapoint.Apiary.Cluster.Replicas;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Cluster.Trust;
using Datapoint.Apiary.Security.Tokens;
using DotNext.Net.Cluster.Consensus.Raft;
using DotNext.Net.Cluster.Consensus.Raft.StateMachine;
using DotNext.Net.Security;
using Microsoft.Extensions.Logging;

namespace Datapoint.Apiary.Cluster.Raft;

public sealed partial class RaftClusterState
{
    private static readonly TimeSpan s_joinRetry = TimeSpan.FromSeconds(2);
    private static readonly TimeSpan s_peerWait = TimeSpan.FromSeconds(20);
    private static readonly TimeSpan s_raftRequestTimeout = TimeSpan.FromSeconds(10);
    private static readonly TimeSpan s_raftConnectTimeout = TimeSpan.FromSeconds(5);
    private static readonly TimeSpan s_raftShutdownTimeout = TimeSpan.FromSeconds(1);
    private readonly Dictionary<Guid, IPEndPoint> _peerAddresses = [];
    private ClusterCa? _bootstrapCa;
    private LiveMemberList? _memberList;

    private string StateDirectory => Path.Combine(DataDirectory, "state");

    private string RaftDirectory => Path.Combine(DataDirectory, "raft");

    private string MembersFile => Path.Combine(RaftDirectory, "members");

    private string HistoryFile => Path.Combine(RaftDirectory, "addresses.json");

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(StateDirectory);
        Directory.CreateDirectory(RaftDirectory);
        Identity = await ReplicaIdentity.LoadOrCreateAsync(DataDirectory, time.GetUtcNow(), cancellationToken);
        if (await LoadKeysAsync(cancellationToken))
        {
            await OpenLogAsync(cancellationToken);
        }

        _run = Task.Run(() => RunAsync(_stopping.Token), CancellationToken.None);
    }

    private async Task RunAsync(CancellationToken cancellationToken)
    {
        try
        {
            Address = await discovery.OwnEndPointAsync(cancellationToken);
            if (_rekeying)
            {
                await RekeyAsync(cancellationToken);
            }

            var recovering = IsRecovering;
            if (recovering)
            {
                PrepareRecovery();
            }
            else if (!_rekeying)
            {
                if (await ObtainCredentialsAsync(cancellationToken) is not { } bootstrapping)
                {
                    ArchiveSupersededState();
                    return;
                }

                _bootstrapping = bootstrapping;
            }

            if (_log is null)
            {
                await OpenLogAsync(cancellationToken);
            }

            if (!recovering)
            {
                RewriteAddresses();
            }

            var membersLoaded = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            var starting = StartRaftAsync(_bootstrapping, recovering, membersLoaded, cancellationToken);
            await Task.WhenAny(starting, membersLoaded.Task);
            var monitoring = MonitorAsync(cancellationToken);
            await starting;
            if (recovering)
            {
                await FinishRecoveryAsync(cancellationToken);
            }

            await BecomeReadyAsync(_bootstrapping, cancellationToken);
            await monitoring;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
        }
        catch (Exception exception)
        {
            LogStartFailed(exception);
            lifetime.StopApplication();
            throw;
        }
    }

    private async Task OpenLogAsync(CancellationToken cancellationToken)
    {
        var snapshots = new DirectoryInfo(Path.Combine(RaftDirectory, "snapshots"));
        snapshots.Create();
        foreach (var unfinished in snapshots.EnumerateFiles("*.tmp"))
        {
            unfinished.Delete();
        }

        _machine = new ApiaryStateMachine(snapshots, encryption, options.Value.SnapshotEvery)
        {
            Applied = entry =>
            {
                LogApplied(Current.Index, new ChangeNames(entry));
                if (ChangesTrust(entry))
                {
                    RefreshCredentials();
                }

                if (ChangesRootKeys(entry))
                {
                    AcceptRootKeys();
                }

                NotifyChanged();
            },
        };
        await _machine.RestoreAsync(cancellationToken);
        _log = new WriteAheadLog(new WriteAheadLog.Options { Location = Path.Combine(RaftDirectory, "log") }, _machine);
        await _log.InitializeAsync(cancellationToken);
        LogLoaded(Current.Index);
        AcceptRootKeys();
        NotifyChanged();
    }

    private bool _bootstrapping;
    private bool _waitingForApproval;

    private async Task<bool?> ObtainCredentialsAsync(CancellationToken cancellationToken)
    {
        using var key = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        var started = time.GetUtcNow();
        while (true)
        {
            var peers = await discovery.PeersAsync(Address!.Address, cancellationToken);
            var answers = WithoutSuperseded(await Task.WhenAll(peers.Select(peer => AskToJoinAsync(peer, key, cancellationToken))));
            var settled = (answers.All(a => a is not null) && KnowsEveryMember()) || time.GetUtcNow() - started > s_peerWait;
            if (answers.Any(a => a?.Status is JoinStatus.Superseded))
            {
                return null;
            }

            if (answers.Any(a => a?.Status is JoinStatus.WrongCluster))
            {
                throw new InvalidOperationException("Another Apiary cluster answers on this network with the same root key. This replica's state belongs to a different cluster; remove its volume to join the running one.");
            }

            NoteWaitingForApproval(answers);
            if (settled && await TryUseAsync(answers, key, cancellationToken))
            {
                return _bootstrapCa is not null;
            }

            await Task.Delay(s_joinRetry, time, cancellationToken);
        }
    }

    private bool KnowsEveryMember()
    {
        var history = AddressHistory.Load(HistoryFile);
        var members = MemberAddressBook.Read(MembersFile).Select(m => history.ReplicaAt(m.ToString())).OfType<Guid>();
        lock (_peerAddresses)
        {
            return members.All(id => id == Identity!.Id || _peerAddresses.ContainsKey(id));
        }
    }

    private void NoteWaitingForApproval(JoinResponse?[] answers)
    {
        if (_waitingForApproval || !answers.Any(a => a?.Status is JoinStatus.Pending) || answers.Any(a => a?.Status is JoinStatus.Joined))
        {
            return;
        }

        _waitingForApproval = true;
        LogWaitingForApproval(Identity!.Id);
    }

    private JoinResponse?[] WithoutSuperseded(JoinResponse?[] answers)
    {
        var superseded = answers.SelectMany(a => a?.Supersedes ?? []).Concat(Current.PreviousClusterIds).ToHashSet();
        return answers.Where(a => a?.ClusterId is not { } id || !superseded.Contains(id)).ToArray();
    }

    private async Task<bool> TryUseAsync(JoinResponse?[] answers, ECDsa key, CancellationToken cancellationToken)
    {
        if (answers.FirstOrDefault(a => a?.Status is JoinStatus.Joined) is { } joined)
        {
            await UseJoinedAsync(joined, key, cancellationToken);
            return true;
        }

        if (answers.Any(a => a?.Status is JoinStatus.Pending))
        {
            return false;
        }

        if (Current.ClusterCa is { } ca)
        {
            UseCredentials(new ReplicaCredentials(key, ClusterAuthority.Issue(ca, key.ExportSubjectPublicKeyInfo(), Identity!.Id, time.GetUtcNow()), TrustedAuthorities(Current)));
            return true;
        }

        if ((options.Value.Slot ?? 1) != 1 || !answers.All(a => a?.Status is JoinStatus.NoCluster))
        {
            LogWaitingForCluster();
            return false;
        }

        await encryption.CreateAsync(StateDirectory, cancellationToken);
        _bootstrapCa = ClusterAuthority.Create(time.GetUtcNow());
        UseCredentials(new ReplicaCredentials(key, ClusterAuthority.Issue(_bootstrapCa, key.ExportSubjectPublicKeyInfo(), Identity!.Id, time.GetUtcNow()), _bootstrapCa.CertificatePem));
        LogBootstrapping();
        return true;
    }

    private async Task UseJoinedAsync(JoinResponse joined, ECDsa key, CancellationToken cancellationToken)
    {
        if (!encryption.IsLoaded)
        {
            await encryption.ImportAsync(StateDirectory, _joinKeys[joined.ClusterId!.Value], cancellationToken);
        }

        UseCredentials(new ReplicaCredentials(key, joined.CertificatePem!, joined.AuthorityPem!));
        LogJoined(joined.Address);
    }

    private readonly Dictionary<Guid, SharedKeyRing> _joinKeys = [];

    private async Task<JoinResponse?> AskToJoinAsync(IPAddress peer, ECDsa key, CancellationToken cancellationToken)
    {
        var request = protocol.Sign(new JoinRequest(
            Identity!.Id, NodeName, Address!.ToString(), Current.ClusterId,
            Base64Url.Encode(key.ExportSubjectPublicKeyInfo()), time.GetUtcNow(), SecretTokens.New()));
        var response = await client.JoinAsync(peer, request, cancellationToken);
        if (response is null || !protocol.Verify(response, request.Nonce))
        {
            return null;
        }

        if (IPEndPoint.TryParse(response.Address, out var address))
        {
            lock (_peerAddresses)
            {
                _peerAddresses[response.ReplicaId] = address;
            }
        }

        if (response is { Status: JoinStatus.Joined, Keys: { } keys, ClusterId: { } clusterId } && protocol.OpenKeys(keys, request.Nonce) is { } ring)
        {
            lock (_joinKeys)
            {
                _joinKeys[clusterId] = ring;
            }
        }

        return response;
    }

    private void UseCredentials(ReplicaCredentials credentials)
    {
        Credentials = credentials;
        client.Use(credentials);
        SaveCredentials(credentials);
    }

    private void RewriteAddresses()
    {
        var now = time.GetUtcNow();
        var current = new Dictionary<Guid, IPEndPoint>(_peerAddresses) { [Identity!.Id] = Address! };
        var history = AddressHistory.Load(HistoryFile).With([
            .. Current.Replicas.Values.Select(r => new KnownAddress(r.Address, r.Id, r.JoinedAt)),
            .. current.Select(c => new KnownAddress(c.Value.ToString(), c.Key, now)),
        ]);
        history.Save(HistoryFile);

        var stored = MemberAddressBook.Read(MembersFile);
        var moved = stored
            .Select(old => (Old: old, Now: history.ReplicaAt(old.ToString()) is { } id ? current.GetValueOrDefault(id) : null))
            .Where(m => m.Now is not null && !m.Now.Equals(m.Old))
            .ToDictionary(m => m.Old, m => m.Now!);
        if (moved.Count == 0)
        {
            return;
        }

        MemberAddressBook.Rewrite(MembersFile, [.. stored.Select(a => moved.GetValueOrDefault(a, a)).Distinct()]);
        LogAddressesRewritten(moved.Count);
    }

    // The monitor starts once the member list is loaded, not once the replica is admitted: a replica
    // that can't reach a leader waits in the announcer forever, and only the monitor notices that its
    // peers moved or that it was superseded.
    private async Task StartRaftAsync(bool bootstrap, bool recovering, TaskCompletionSource membersLoaded, CancellationToken cancellationToken)
    {
        var configuration = new RaftCluster.TcpConfiguration(new IPEndPoint(options.Value.BindAddress ?? (discovery.IsSwarm ? Address!.Address : IPAddress.Loopback), options.Value.RaftPort))
        {
            PublicEndPoint = Address!,
            ConfigurationStorage = _memberList = new LiveMemberList(MembersFile),
            ColdStart = bootstrap,
            Announcer = discovery.IsSwarm && !recovering ? AnnounceOnceLoadedAsync : null,
            LoggerFactory = loggers,
            RequestTimeout = s_raftRequestTimeout,
            ConnectTimeout = s_raftConnectTimeout,
            GracefulShutdownTimeout = s_raftShutdownTimeout,
            SslOptions = new SslOptions
            {
                ServerOptions = ReplicaCredentials.ServerOptions(() => Credentials, IsTrustedReplica),
                ClientOptions = ReplicaCredentials.ClientOptions(() => Credentials),
            },
        };
        _raft = new RaftCluster(configuration) { AuditTrail = _log! };
        _raft.LeaderChanged += (_, _) => NotifyChanged();
        await _raft.StartAsync(cancellationToken);
        membersLoaded.TrySetResult();

        Task AnnounceOnceLoadedAsync(EndPoint address, IReadOnlyDictionary<string, string> metadata, CancellationToken token)
        {
            membersLoaded.TrySetResult();
            return AnnounceAsync(address, metadata, token);
        }
    }

    private async Task BecomeReadyAsync(bool bootstrap, CancellationToken cancellationToken)
    {
        if (bootstrap)
        {
            await _raft!.WaitForLeadershipAsync(cancellationToken);
            await AppendLocalAsync(CreationEntry(), cancellationToken);
        }

        await _raft!.Readiness.WaitAsync(cancellationToken);
        await CatchUpAsync(cancellationToken);
        _ready.TrySetResult();
        NotifyChanged();
        LogReady(Address!, Current.Index);
    }

    private async Task CatchUpAsync(CancellationToken cancellationToken)
    {
        while (!IsLeader)
        {
            try
            {
                await _raft!.ApplyReadBarrierAsync(cancellationToken);
                return;
            }
            catch (QuorumUnreachableException)
            {
                await Task.Delay(s_joinRetry, time, cancellationToken);
            }
        }
    }

    private StateEntry CreationEntry()
    {
        var now = time.GetUtcNow();
        IStateChange[] changes =
        [
            new ClusterCreated(Guid.CreateVersion7(now), _bootstrapCa!),
            new ProjectSaved(new Project(Guid.CreateVersion7(now), "Default", "Routes that don't belong to another project yet.", "folder")),
            new ReplicaSaved(new Replica(Identity!.Id, NodeName, Address!.ToString(), now, StateSchema.Current, protocol.OwnKeys.RootKeyId)),
            new Keys.RootKeyRegistered(protocol.OwnKeys, now),
        ];
        return new StateEntry(Guid.CreateVersion7(now), now, changes);
    }

    private string NodeName => options.Value.NodeName ?? Environment.MachineName;

    [LoggerMessage(Level = LogLevel.Debug, Message = "Applied the entry at index {Index}: {Changes}")]
    private partial void LogApplied(long index, ChangeNames changes);

    [LoggerMessage(Level = LogLevel.Information, Message = "Loaded the state at index {Index}")]
    private partial void LogLoaded(long index);

    [LoggerMessage(Level = LogLevel.Information, Message = "Got this replica's certificate and keys from {Peer}; it takes part in the cluster once a leader admits it")]
    private partial void LogJoined(string peer);

    [LoggerMessage(Level = LogLevel.Information, Message = "No cluster found, so this replica creates one")]
    private partial void LogBootstrapping();

    [LoggerMessage(Level = LogLevel.Warning, Message = "The cluster uses manual membership, so this replica ({ReplicaId}) waits until an administrator approves it on the Replicas page")]
    private partial void LogWaitingForApproval(Guid replicaId);

    [LoggerMessage(Level = LogLevel.Information, Message = "Waiting for the first replica to create the cluster")]
    private partial void LogWaitingForCluster();

    [LoggerMessage(Level = LogLevel.Warning, Message = "Replicas changed addresses since they last ran; updated {Count} in the member list")]
    private partial void LogAddressesRewritten(int count);

    [LoggerMessage(Level = LogLevel.Information, Message = "Ready at {Address}, caught up to index {Index}")]
    private partial void LogReady(IPEndPoint address, long index);

    [LoggerMessage(Level = LogLevel.Critical, Message = "The replica couldn't start its part of the cluster, so Apiary stops")]
    private partial void LogStartFailed(Exception exception);

    private readonly record struct ChangeNames(StateEntry Entry)
    {
        public override string ToString() => string.Join(", ", Entry.Changes.Select(c => c.GetType().Name));
    }
}
