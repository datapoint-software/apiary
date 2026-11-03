using System.Net;
using System.Net.Http.Json;
using Datapoint.Apiary.Cluster.Acme;
using Datapoint.Apiary.Cluster.Join;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Cluster.Trust;
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
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(s_writeTimeout);
        try
        {
            await raft.ReplicateAsync(_machine!.Seal(entry), context: null, timeout.Token);
        }
        catch (Exception exception) when (exception is NotLeaderException or QuorumUnreachableException
            || (exception is OperationCanceledException && !cancellationToken.IsCancellationRequested))
        {
            throw new ClusterUnavailableException("The change wasn't confirmed by a majority of replicas.", exception);
        }
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

    private sealed class Releaser(SemaphoreSlim semaphore) : IDisposable
    {
        public void Dispose() => semaphore.Release();
    }
}
