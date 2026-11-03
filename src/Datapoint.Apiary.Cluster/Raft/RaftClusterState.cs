using System.Net;
using System.Net.Http.Json;
using Datapoint.Apiary.Cluster.Acme;
using Datapoint.Apiary.Cluster.Join;
using Datapoint.Apiary.Cluster.Replicas;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Cluster.Trust;
using DotNext.Net.Cluster;
using DotNext.Net.Cluster.Consensus.Raft;
using DotNext.Net.Cluster.Consensus.Raft.StateMachine;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;

namespace Datapoint.Apiary.Cluster.Raft;

public sealed partial class RaftClusterState(
    IOptions<ClusterOptions> options,
    StateEncryption encryption,
    JoinProtocol protocol,
    ClusterClient client,
    PeerDiscovery discovery,
    IHostApplicationLifetime lifetime,
    TimeProvider time,
    ILoggerFactory loggers,
    ILogger<RaftClusterState> logger)
    : IClusterState, IHostedService, IAsyncDisposable
{
    private static readonly TimeSpan s_writeTimeout = TimeSpan.FromSeconds(30);
    private readonly SemaphoreSlim _writes = new(1, 1);
    private readonly CancellationTokenSource _stopping = new();
    private readonly TaskCompletionSource _ready = new(TaskCreationOptions.RunContinuationsAsynchronously);
    private CancellationTokenSource _changed = new();
    private ApiaryStateMachine? _machine;
    private WriteAheadLog? _log;
    private RaftCluster? _raft;
    private Task _run = Task.CompletedTask;

    public ApiaryState Current => _machine?.Current ?? ApiaryState.Empty;

    public ReplicaIdentity? Identity { get; private set; }

    public IPEndPoint? Address { get; private set; }

    public ReplicaCredentials? Credentials { get; private set; }

    public bool IsReady => _ready.Task.IsCompleted;

    public bool IsHealthy => IsReady || (discovery.IsSwarm && !_run.IsCompleted);

    [System.Diagnostics.CodeAnalysis.SuppressMessage("Usage", "VSTHRD003", Justification = "_ready completes when this instance's startup finishes.")]
    public async Task WaitUntilReadyAsync(CancellationToken cancellationToken) => await _ready.Task.WaitAsync(cancellationToken);

    public bool IsLeader => _raft?.Leader is { IsRemote: false };

    public bool IsWritable => _raft is { } raft && (IsLeader || (raft.Leader is not null && !raft.ConsensusToken.IsCancellationRequested));

    public IPAddress? LeaderAddress => (_raft?.Leader?.EndPoint as IPEndPoint)?.Address;

    public RaftCluster? Raft => _raft;

    private string DataDirectory => options.Value.DataDirectory;

    public IChangeToken GetChangeToken() => new CancellationChangeToken(_changed.Token);

    public async ValueTask<IDisposable> LockAsync(CancellationToken cancellationToken)
    {
        await _writes.WaitAsync(cancellationToken);
        return new Releaser(_writes);
    }

    public async ValueTask AppendAsync(StateEntry entry, CancellationToken cancellationToken)
    {
        if (IsLeader)
        {
            await AppendLocalAsync(entry, cancellationToken);
            return;
        }

        var leader = LeaderAddress ?? throw new ClusterUnavailableException();
        using var response = await client.SendAsync(leader, "entries", JsonContent.Create(entry, ClusterJsonContext.Default.StateEntry), cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new ClusterUnavailableException();
        }

        await WaitForAsync(state => state.AppliedRequests.ContainsKey(entry.RequestId), cancellationToken);
    }

    public async ValueTask AppendLocalAsync(StateEntry entry, CancellationToken cancellationToken)
    {
        var raft = _raft ?? throw new ClusterUnavailableException();
        if (StateSchema.Required(entry) > StateSchema.Supported(Current))
        {
            throw new ClusterUpgradingException();
        }

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(s_writeTimeout);
        try
        {
            await raft.ReplicateAsync(_machine!.Seal(entry), context: null, timeout.Token);
            await raft.ForceReplicationAsync(timeout.Token);
        }
        catch (Exception exception) when (exception is NotLeaderException or QuorumUnreachableException
            || (exception is OperationCanceledException && !cancellationToken.IsCancellationRequested))
        {
            throw new ClusterUnavailableException("The change wasn't confirmed by a majority of replicas.", exception);
        }
    }

    public async Task<ClusterView> DescribeAsync(CancellationToken cancellationToken)
    {
        var local = Describe();
        if (IsLeader || LeaderAddress is not { } leader || await FetchViewAsync(leader, cancellationToken) is not { } view)
        {
            return local;
        }

        var own = Address?.ToString();
        return local with { Members = [.. view.Members.Select(m => m with { Local = m.Address == own })], Pending = view.Pending };
    }

    private async Task<ClusterView?> FetchViewAsync(IPAddress peer, CancellationToken cancellationToken)
    {
        try
        {
            using var response = await client.GetAsync(peer, "view", cancellationToken);
            return response.IsSuccessStatusCode
                ? await response.Content.ReadFromJsonAsync(ClusterWireJsonContext.Default.ClusterView, cancellationToken)
                : null;
        }
        catch (Exception exception) when (exception is HttpRequestException or ClusterUnavailableException
            || (exception is OperationCanceledException && !cancellationToken.IsCancellationRequested))
        {
            return null;
        }
    }

    public ClusterView Describe()
    {
        var state = Current;
        var members = _raft?.Members.Select(m =>
        {
            var address = m.EndPoint.ToString() ?? "";
            var replica = state.Replicas.Values.FirstOrDefault(r => r.Address == address);
            var role = m.IsLeader ? MemberRole.Leader : MemberRole.Voter;
            return new MemberView(replica?.Id, replica?.Node, address, role, !m.IsRemote || m.Status is ClusterMemberStatus.Available, !m.IsRemote, replica?.JoinedAt, MissingSince(address));
        }).ToList() ?? [];
        return new ClusterView(options.Value.Mode.ToString(), IsReady, IsWritable, state.Index, Identity?.Id, members, Membership, Pending);
    }

    public async Task<AcmeChallenge?> FindChallengeAsync(string token, CancellationToken cancellationToken)
    {
        if (Current.AcmeChallenges.TryGetValue(token, out var challenge) || IsLeader || LeaderAddress is not { } leader)
        {
            return challenge;
        }

        try
        {
            using var response = await client.GetAsync(leader, "challenges/" + Uri.EscapeDataString(token), cancellationToken);
            return response.IsSuccessStatusCode
                ? await response.Content.ReadFromJsonAsync(ClusterWireJsonContext.Default.AcmeChallenge, cancellationToken)
                : null;
        }
        catch (Exception exception) when (exception is HttpRequestException or ClusterUnavailableException
            || (exception is OperationCanceledException && !cancellationToken.IsCancellationRequested))
        {
            return null;
        }
    }

    public async Task SyncAsync(CancellationToken cancellationToken)
    {
        if (_raft is null || IsLeader)
        {
            return;
        }

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(2));
        try
        {
            await _raft.ApplyReadBarrierAsync(timeout.Token);
        }
        catch (Exception exception) when (exception is QuorumUnreachableException
            || (exception is OperationCanceledException && !cancellationToken.IsCancellationRequested))
        {
            LogSyncFailed();
        }
    }

    public async Task WaitForAsync(Func<ApiaryState, bool> condition, CancellationToken cancellationToken)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(s_writeTimeout);
        while (!condition(Current))
        {
            var changed = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            using (GetChangeToken().RegisterChangeCallback(_ => changed.TrySetResult(), null))
            {
                if (condition(Current))
                {
                    return;
                }

                await changed.Task.WaitAsync(timeout.Token);
            }
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (_raft is not null)
        {
            await _raft.DisposeAsync();
        }

        if (_log is not null)
        {
            await _log.DisposeAsync();
        }

        if (_machine is not null)
        {
            await _machine.DisposeAsync();
        }

        Credentials?.Dispose();
        _writes.Dispose();
        _stopping.Dispose();
        _changed.Dispose();
    }

    private void NotifyChanged()
    {
        var previous = Interlocked.Exchange(ref _changed, new CancellationTokenSource());
        previous.Cancel();
        previous.Dispose();
    }

    [LoggerMessage(Level = LogLevel.Debug, Message = "Couldn't confirm with the leader that this replica is up to date")]
    private partial void LogSyncFailed();

    private sealed class Releaser(SemaphoreSlim semaphore) : IDisposable
    {
        public void Dispose() => semaphore.Release();
    }
}
