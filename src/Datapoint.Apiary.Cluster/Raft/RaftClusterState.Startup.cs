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
    private readonly Dictionary<Guid, IPEndPoint> _peerAddresses = [];
    private ClusterCa? _bootstrapCa;

    private string StateDirectory => Path.Combine(DataDirectory, "state");

    private string RaftDirectory => Path.Combine(DataDirectory, "raft");

    private string MembersFile => Path.Combine(RaftDirectory, "members");

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(StateDirectory);
        Directory.CreateDirectory(RaftDirectory);
        Identity = await ReplicaIdentity.LoadOrCreateAsync(DataDirectory, time.GetUtcNow(), cancellationToken);
        if (await encryption.LoadAsync(StateDirectory, cancellationToken))
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
            var bootstrap = await ObtainCredentialsAsync(cancellationToken);
            if (_log is null)
            {
                await OpenLogAsync(cancellationToken);
            }

            RewriteAddresses();
            await StartRaftAsync(bootstrap, cancellationToken);
            await BecomeReadyAsync(bootstrap, cancellationToken);
            await MonitorAsync(cancellationToken);
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
            Applied = _ => NotifyChanged(),
        };
        await _machine.RestoreAsync(cancellationToken);
        _log = new WriteAheadLog(new WriteAheadLog.Options { Location = Path.Combine(RaftDirectory, "log") }, _machine);
        await _log.InitializeAsync(cancellationToken);
        LogLoaded(Current.Index);
        NotifyChanged();
    }

    private async Task<bool> ObtainCredentialsAsync(CancellationToken cancellationToken)
    {
        using var key = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        var started = time.GetUtcNow();
        while (true)
        {
            var peers = await discovery.PeersAsync(Address!.Address, cancellationToken);
            var answers = await Task.WhenAll(peers.Select(peer => AskToJoinAsync(peer, key, cancellationToken)));
            var settled = answers.All(a => a is not null) || time.GetUtcNow() - started > s_peerWait;
            if (answers.Any(a => a?.Status is JoinStatus.WrongCluster))
            {
                throw new InvalidOperationException("Another Apiary cluster answers on this network with the same root key. This replica's state belongs to a different cluster; remove its volume to join the running one.");
            }

            if (settled && await TryUseAsync(answers, key, cancellationToken))
            {
                return _bootstrapCa is not null;
            }

            await Task.Delay(s_joinRetry, time, cancellationToken);
        }
    }

    private async Task<bool> TryUseAsync(JoinResponse?[] answers, ECDsa key, CancellationToken cancellationToken)
    {
        if (answers.FirstOrDefault(a => a?.Status is JoinStatus.Joined) is { } joined)
        {
            if (!encryption.IsLoaded)
            {
                await encryption.ImportAsync(StateDirectory, _joinKeys!, cancellationToken);
            }

            UseCredentials(new ReplicaCredentials(key, joined.CertificatePem!, joined.AuthorityPem!));
            LogJoined(joined.Address);
            return true;
        }

        if (Current.ClusterCa is { } ca)
        {
            UseCredentials(new ReplicaCredentials(key, ClusterAuthority.Issue(ca, key.ExportSubjectPublicKeyInfo(), Identity!.Id, time.GetUtcNow()), ca.CertificatePem));
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

    private SharedKeyRing? _joinKeys;

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

        lock (_peerAddresses)
        {
            _peerAddresses[response.ReplicaId] = IPEndPoint.Parse(response.Address);
        }

        if (response is { Status: JoinStatus.Joined, Keys: { } keys })
        {
            _joinKeys ??= protocol.OpenKeys(keys, request.Nonce);
        }

        return response;
    }

    private void UseCredentials(ReplicaCredentials credentials)
    {
        Credentials = credentials;
        client.Use(credentials);
    }

    private void RewriteAddresses()
    {
        var stored = MemberAddressBook.Read(MembersFile);
        if (stored.Count == 0)
        {
            return;
        }

        var moved = new Dictionary<IPEndPoint, IPEndPoint>(Current.Replicas.Count);
        foreach (var replica in Current.Replicas.Values)
        {
            var now = replica.Id == Identity!.Id ? Address : _peerAddresses.GetValueOrDefault(replica.Id);
            if (now is not null && IPEndPoint.TryParse(replica.Address, out var old) && !old.Equals(now))
            {
                moved[old] = now;
            }
        }

        if (!stored.Any(moved.ContainsKey))
        {
            return;
        }

        MemberAddressBook.Rewrite(MembersFile, [.. stored.Select(a => moved.GetValueOrDefault(a, a)).Distinct()]);
        LogAddressesRewritten(moved.Count);
    }

    private async Task StartRaftAsync(bool bootstrap, CancellationToken cancellationToken)
    {
        var configuration = new RaftCluster.TcpConfiguration(new IPEndPoint(discovery.IsSwarm ? IPAddress.Any : IPAddress.Loopback, options.Value.RaftPort))
        {
            PublicEndPoint = Address!,
            ConfigurationStorage = new MemberAddressBook(MembersFile),
            ColdStart = bootstrap,
            Announcer = discovery.IsSwarm ? AnnounceAsync : null,
            LoggerFactory = loggers,
            SslOptions = new SslOptions
            {
                ServerOptions = Credentials!.ServerOptions(requireClientCertificate: true),
                ClientOptions = Credentials.ClientOptions(),
            },
        };
        _raft = new RaftCluster(configuration) { AuditTrail = _log! };
        _raft.LeaderChanged += (_, _) => NotifyChanged();
        await _raft.StartAsync(cancellationToken);
    }

    private async Task BecomeReadyAsync(bool bootstrap, CancellationToken cancellationToken)
    {
        if (bootstrap)
        {
            await _raft!.WaitForLeadershipAsync(cancellationToken);
            await AppendLocalAsync(CreationEntry(), cancellationToken);
        }

        await _raft!.Readiness.WaitAsync(cancellationToken);
        if (!IsLeader)
        {
            await _raft.ApplyReadBarrierAsync(cancellationToken);
        }

        _ready.TrySetResult();
        NotifyChanged();
        LogReady(Address!, Current.Index);
    }

    private StateEntry CreationEntry()
    {
        var now = time.GetUtcNow();
        IStateChange[] changes =
        [
            new ClusterCreated(Guid.CreateVersion7(now), _bootstrapCa!),
            new ProjectSaved(new Project(Guid.CreateVersion7(now), "Default", "Routes that don't belong to another project yet.", "folder")),
            new ReplicaSaved(new Replica(Identity!.Id, NodeName, Address!.ToString(), now)),
        ];
        return new StateEntry(Guid.CreateVersion7(now), now, changes);
    }

    private string NodeName => options.Value.NodeName ?? Environment.MachineName;

    [LoggerMessage(Level = LogLevel.Information, Message = "Loaded the state at index {Index}")]
    private partial void LogLoaded(long index);

    [LoggerMessage(Level = LogLevel.Information, Message = "Joined the cluster through {Peer}")]
    private partial void LogJoined(string peer);

    [LoggerMessage(Level = LogLevel.Information, Message = "No cluster found, so this replica creates one")]
    private partial void LogBootstrapping();

    [LoggerMessage(Level = LogLevel.Information, Message = "Waiting for the first replica to create the cluster")]
    private partial void LogWaitingForCluster();

    [LoggerMessage(Level = LogLevel.Warning, Message = "Replicas changed addresses since they last ran; updated {Count} in the member list")]
    private partial void LogAddressesRewritten(int count);

    [LoggerMessage(Level = LogLevel.Information, Message = "Ready at {Address}, caught up to index {Index}")]
    private partial void LogReady(IPEndPoint address, long index);

    [LoggerMessage(Level = LogLevel.Critical, Message = "The replica couldn't start its part of the cluster, so Apiary stops")]
    private partial void LogStartFailed(Exception exception);
}
