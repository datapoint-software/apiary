using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Json;
using Datapoint.Apiary.Cluster.Join;
using Datapoint.Apiary.Cluster.Replicas;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Cluster.Trust;
using Datapoint.Apiary.Security.Tokens;
using DotNext.Net.Cluster;
using Microsoft.Extensions.Logging;

namespace Datapoint.Apiary.Cluster.Raft;

public sealed partial class RaftClusterState
{
    private static readonly TimeSpan s_monitorInterval = TimeSpan.FromSeconds(15);
    private static readonly TimeSpan s_leaveTimeout = TimeSpan.FromSeconds(10);
    private static readonly TimeSpan s_peerWaitTimeout = TimeSpan.FromSeconds(15);
    private static readonly TimeSpan s_stuckTimeout = TimeSpan.FromSeconds(45);
    private DateTimeOffset? _stuckSince;
    private readonly SemaphoreSlim _membership = new(1, 1);
    private static readonly TimeSpan s_pendingExpiry = TimeSpan.FromMinutes(1);
    private readonly ConcurrentDictionary<IPEndPoint, DateTimeOffset> _missingSince = [];
    private readonly ConcurrentDictionary<Guid, PendingReplica> _pending = [];

    public JoinResponse? AnswerJoin(JoinRequest request, IPAddress? remote)
    {
        var now = time.GetUtcNow();
        if (Address is null || Genuine(request, remote, now) is not { } joinKeys || Base64Url.TryDecode(request.PublicKey) is not { } publicKey)
        {
            return null;
        }

        var state = Current;
        var self = Identity?.Id ?? Guid.Empty;
        var address = Address.ToString();
        if (Refusal(state, request) is { } refusal)
        {
            return JoinProtocol.Sign(new JoinResponse(refusal, self, address, state.ClusterId, null, null, null, state.PreviousClusterIds), request.Nonce, joinKeys);
        }

        if (!IsAdmitted(state, request.ReplicaId))
        {
            _pending.AddOrUpdate(
                request.ReplicaId,
                id => new PendingReplica(id, request.Node, request.Address, now, now),
                (_, pending) => pending with { Node = request.Node, Address = request.Address, LastSeen = now });
            return JoinProtocol.Sign(new JoinResponse(JoinStatus.Pending, self, address, state.ClusterId, null, null, null, state.PreviousClusterIds), request.Nonce, joinKeys);
        }

        var ca = state.ClusterCa!;
        var authorities = TrustedAuthorities(state);

        var certificate = ClusterAuthority.Issue(ca, publicKey, request.ReplicaId, now);
        var keys = JoinProtocol.SealKeys(encryption.Export(), request.Nonce, joinKeys);
        return JoinProtocol.Sign(new JoinResponse(JoinStatus.Joined, self, address, state.ClusterId, authorities, certificate, keys, state.PreviousClusterIds), request.Nonce, joinKeys);
    }

    private static JoinStatus? Refusal(ApiaryState state, JoinRequest request) => (state.ClusterCa, request.ClusterId) switch
    {
        (null, _) => JoinStatus.NoCluster,
        (_, { } id) when state.PreviousClusterIds.Contains(id) => JoinStatus.Superseded,
        (_, { } id) when id != state.ClusterId => JoinStatus.WrongCluster,
        _ => null,
    };

    private static bool IsAdmitted(ApiaryState state, Guid replicaId) =>
        state.Membership?.Mode is not MembershipMode.Manual
        || state.Replicas.ContainsKey(replicaId)
        || state.ApprovedReplicas.Contains(replicaId);

    public MembershipSettings Membership =>
        Current.Membership ?? new MembershipSettings(MembershipMode.Automatic, (int)Math.Ceiling(options.Value.MissingTimeout.TotalMinutes));

    public IReadOnlyList<PendingReplica> Pending
    {
        get
        {
            var now = time.GetUtcNow();
            var state = Current;
            foreach (var stale in _pending.Values.Where(p => now - p.LastSeen > s_pendingExpiry || IsAdmitted(state, p.Id)))
            {
                _pending.TryRemove(stale.Id, out _);
            }

            return [.. _pending.Values.OrderBy(p => p.Since)];
        }
    }

    public DateTimeOffset? MissingSince(string address) =>
        IPEndPoint.TryParse(address, out var endPoint) && _missingSince.TryGetValue(endPoint, out var since) ? since : null;

    public bool IsReachable(Replica replica) =>
        replica.Address == Address?.ToString()
        || _raft?.Members.Any(m => m.EndPoint.ToString() == replica.Address && m.Status is ClusterMemberStatus.Available) is true;

    public async Task RemoveReplicaAsync(Replica replica, CancellationToken cancellationToken)
    {
        await _membership.WaitAsync(cancellationToken);
        try
        {
            var address = IPEndPoint.Parse(replica.Address);
            await RemoveMemberAsync(address, cancellationToken);
            _missingSince.TryRemove(address, out _);
            LogRemoved(replica.Node, replica.Address);
        }
        finally
        {
            _membership.Release();
        }
    }

    private JoinKeySet? Genuine(JoinRequest request, IPAddress? remote, DateTimeOffset now) =>
        IPEndPoint.TryParse(request.Address, out var claimed)
        && remote is not null
        && claimed.Address.Equals(remote.IsIPv4MappedToIPv6 ? remote.MapToIPv4() : remote)
            ? protocol.Verify(request, now)
            : null;

    public async Task<bool> AdmitAsync(ReplicaAnnouncement announcement, CancellationToken cancellationToken)
    {
        if (!IsLeader)
        {
            return await RelayToLeaderAsync("announce", announcement, cancellationToken);
        }

        if (!IsAdmitted(Current, announcement.ReplicaId))
        {
            return false;
        }

        var address = IPEndPoint.Parse(announcement.Address);
        await _membership.WaitAsync(cancellationToken);
        try
        {
            var running = await discovery.ResolveAsync(cancellationToken);
            var stale = Current.Replicas.Values
                .Where(r => r.Address != announcement.Address
                    && (r.Id == announcement.ReplicaId || (r.Node == announcement.Node && !running.Contains(IPEndPoint.Parse(r.Address).Address))))
                .ToList();
            foreach (var replica in stale)
            {
                await RemoveMemberAsync(IPEndPoint.Parse(replica.Address), cancellationToken);
            }

            if (!IsMember(address) && !await _raft!.AddMemberAsync(address, cancellationToken))
            {
                return false;
            }

            var now = time.GetUtcNow();
            IStateChange[] changes =
            [
                .. stale.Where(r => r.Id != announcement.ReplicaId).Select(r => new ReplicaRemoved(r.Id, now)),
                new ReplicaSaved(new Replica(announcement.ReplicaId, announcement.Node, announcement.Address, now, announcement.Schema, announcement.RootKey?.RootKeyId)),
                .. RootKeyChanges(announcement.RootKey, now),
            ];
            await AppendLocalAsync(new StateEntry(Guid.CreateVersion7(now), now, changes), cancellationToken);
            LogAdmitted(announcement.Node, announcement.Address);
            return true;
        }
        finally
        {
            _membership.Release();
        }
    }

    public async Task<bool> ReleaseAsync(ReplicaAnnouncement announcement, CancellationToken cancellationToken)
    {
        if (!IsLeader)
        {
            return await RelayToLeaderAsync("leave", announcement, cancellationToken);
        }

        await _membership.WaitAsync(cancellationToken);
        try
        {
            var address = IPEndPoint.Parse(announcement.Address);
            if (_raft!.Members.Count <= 1 || address.Equals(Address))
            {
                return false;
            }

            await RemoveMemberAsync(address, cancellationToken);
            var now = time.GetUtcNow();
            await AppendLocalAsync(new StateEntry(Guid.CreateVersion7(now), now, [new ReplicaLeft(announcement.ReplicaId)]), cancellationToken);
            LogLeft(announcement.Node, announcement.Address);
            return true;
        }
        finally
        {
            _membership.Release();
        }
    }

    [System.Diagnostics.CodeAnalysis.SuppressMessage("Usage", "VSTHRD003", Justification = "The first call starts _stop on this instance, and later calls wait for it.")]
    public Task StopAsync(CancellationToken cancellationToken)
    {
        lock (_stopGate)
        {
            return _stop ??= StopOnceAsync(cancellationToken);
        }
    }

    [System.Diagnostics.CodeAnalysis.SuppressMessage("Usage", "VSTHRD003", Justification = "StartAsync starts _run on this instance.")]
    private async Task StopOnceAsync(CancellationToken cancellationToken)
    {
        if (_raft is not null && discovery.IsSwarm && IsReady)
        {
            await WaitForPeersAsync(cancellationToken);
            await LeaveAsync(cancellationToken);
        }

        await _stopping.CancelAsync();
        await _run.ConfigureAwait(ConfigureAwaitOptions.SuppressThrowing);
        if (_raft is null)
        {
            return;
        }

        await _raft.StopAsync(cancellationToken);
    }

    private async Task WaitForPeersAsync(CancellationToken cancellationToken)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(s_peerWaitTimeout);
        try
        {
            if (await PeersReadyAsync(timeout.Token))
            {
                return;
            }

            LogWaitingForPeers();
            do
            {
                await Task.Delay(s_joinRetry, time, timeout.Token);
            }
            while (!await PeersReadyAsync(timeout.Token));
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            LogPeersNotReady();
        }
    }

    private async Task<bool> PeersReadyAsync(CancellationToken cancellationToken)
    {
        var peers = await discovery.PeersAsync(Address!.Address, cancellationToken);
        var views = await Task.WhenAll(peers.Select(peer => FetchViewAsync(peer, cancellationToken)));
        return views.All(view => view?.Ready is true);
    }

    private async Task LeaveAsync(CancellationToken cancellationToken)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(s_leaveTimeout);
        try
        {
            if (IsLeader && _raft!.Members.Count > 1)
            {
                do
                {
                    if (IsLeader)
                    {
                        await ((DotNext.Net.Cluster.ICluster)_raft).ResignAsync(timeout.Token);
                    }

                    await WaitForNewLeaderAsync(timeout.Token);
                }
                while (_raft.Leader is not { IsRemote: true });
            }

            if (LeaderAddress is { } leader && !IsLeader)
            {
                using var response = await client.SendAsync(leader, "leave", JsonContent.Create(Announcement(), ClusterWireJsonContext.Default.ReplicaAnnouncement), timeout.Token);
                LogLeaving(response.IsSuccessStatusCode);
            }
        }
        catch (Exception exception) when (exception is OperationCanceledException or HttpRequestException or ClusterUnavailableException)
        {
            LogLeaveFailed(exception);
        }
    }

    private async Task WaitForNewLeaderAsync(CancellationToken cancellationToken)
    {
        using var attempt = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        attempt.CancelAfter(s_joinRetry);
        try
        {
            await WaitForAsync(_ => _raft!.Leader is { IsRemote: true }, attempt.Token);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
        }
    }

    private async Task AnnounceAsync(EndPoint address, IReadOnlyDictionary<string, string> metadata, CancellationToken cancellationToken)
    {
        while (true)
        {
            foreach (var peer in await AnnouncementTargetsAsync(cancellationToken))
            {
                try
                {
                    using var response = await client.SendAsync(peer, "announce", JsonContent.Create(Announcement(), ClusterWireJsonContext.Default.ReplicaAnnouncement), cancellationToken);
                    if (response.IsSuccessStatusCode)
                    {
                        return;
                    }
                }
                catch (HttpRequestException)
                {
                }
            }

            await Task.Delay(s_joinRetry, time, cancellationToken);
        }
    }

    private async Task<IReadOnlyList<IPAddress>> AnnouncementTargetsAsync(CancellationToken cancellationToken) =>
        LeaderAddress is { } leader && !IsLeader ? [leader] : await discovery.PeersAsync(Address!.Address, cancellationToken);

    private ReplicaAnnouncement Announcement() => new(Identity!.Id, NodeName, Address!.ToString(), StateSchema.Current, protocol.OwnKeys);

    private async Task<bool> RelayToLeaderAsync(string path, ReplicaAnnouncement announcement, CancellationToken cancellationToken)
    {
        if (LeaderAddress is not { } leader)
        {
            return false;
        }

        using var response = await client.SendAsync(leader, path, JsonContent.Create(announcement, ClusterWireJsonContext.Default.ReplicaAnnouncement), cancellationToken);
        return response.IsSuccessStatusCode;
    }

    private async Task MonitorAsync(CancellationToken cancellationToken)
    {
        if (!discovery.IsSwarm)
        {
            return;
        }

        while (!cancellationToken.IsCancellationRequested)
        {
            await Task.Delay(s_monitorInterval, time, cancellationToken);
            try
            {
                if (await IsSupersededAsync(outsidersOnly: true, cancellationToken))
                {
                    ArchiveSupersededState();
                    return;
                }

                await RemoveMissingAsync(cancellationToken);
                await ForgetOldRootKeysAsync(cancellationToken);
                await CheckMovedPeersAsync(cancellationToken);
            }
            catch (Exception exception) when (exception is ClusterUnavailableException or InvalidOperationException or HttpRequestException)
            {
                LogMonitorFailed(exception);
            }
        }
    }

    private async Task RemoveMissingAsync(CancellationToken cancellationToken)
    {
        if (!IsLeader)
        {
            _missingSince.Clear();
            return;
        }

        var membership = Membership;
        var timeout = Current.Membership is null ? options.Value.MissingTimeout : TimeSpan.FromMinutes(membership.RemoveMissingAfterMinutes);
        var running = await discovery.ResolveAsync(cancellationToken);
        var now = time.GetUtcNow();
        foreach (var member in _raft!.Members.Where(m => m.IsRemote).Select(m => (IPEndPoint)m.EndPoint))
        {
            if (running.Contains(member.Address))
            {
                _missingSince.TryRemove(member, out _);
                continue;
            }

            var since = _missingSince.TryAdd(member, now) ? now : _missingSince[member];
            if (membership.Mode is MembershipMode.Automatic && now - since >= timeout)
            {
                await RemoveMissingMemberAsync(member, cancellationToken);
            }
        }
    }

    private async Task CheckMovedPeersAsync(CancellationToken cancellationToken)
    {
        var now = time.GetUtcNow();
        if (LeaderAddress is not null && IsReady)
        {
            _stuckSince = null;
            return;
        }

        _stuckSince ??= now;
        if (now - _stuckSince < s_stuckTimeout)
        {
            return;
        }

        if (await IsSupersededAsync(outsidersOnly: false, cancellationToken))
        {
            ArchiveSupersededState();
            return;
        }

        foreach (var peer in await discovery.PeersAsync(Address!.Address, cancellationToken))
        {
            var view = await FetchViewAsync(peer, cancellationToken);
            if (IsRemoved(view))
            {
                LogRemovedFromCluster();
                lifetime.StopApplication();
                return;
            }

            if (Moved(view) is { } moved)
            {
                NoteMoved(moved, now);
                return;
            }
        }
    }

    private void NoteMoved(Replica moved, DateTimeOffset now)
    {
        var node = moved.Node ?? moved.Id.ToString();
        if (!IsReady)
        {
            LogRestartingForMovedPeer(node, moved.Address);
            lifetime.StopApplication();
            return;
        }

        LogPeerMoved(node, moved.Address);
        _stuckSince = now;
    }

    private bool IsRemoved(ClusterView? view)
    {
        var own = Address?.ToString();
        return view is not null
            && view.Members.Any(m => m.Role is MemberRole.Leader)
            && view.Members.All(m => m.Address != own && m.Id != Identity?.Id);
    }

    private Replica? Moved(ClusterView? view)
    {
        var address = view?.Members.FirstOrDefault(m => m.Local)?.Address;
        if (view?.ReplicaId is not { } id || address is null || !Current.Replicas.TryGetValue(id, out var known))
        {
            return null;
        }

        return IPEndPoint.TryParse(address, out var endPoint) && !IsMember(endPoint) ? known with { Address = address } : null;
    }

    private async Task RemoveMissingMemberAsync(IPEndPoint member, CancellationToken cancellationToken)
    {
        await _membership.WaitAsync(cancellationToken);
        try
        {
            await RemoveMemberAsync(member, cancellationToken);
            _missingSince.TryRemove(member, out _);
            var replica = Current.Replicas.Values.FirstOrDefault(r => r.Address == member.ToString());
            var now = time.GetUtcNow();
            if (replica is not null)
            {
                await AppendLocalAsync(new StateEntry(Guid.CreateVersion7(now), now, [new ReplicaRemoved(replica.Id, now)]), cancellationToken);
            }

            LogRemovedMissing(member.ToString());
        }
        finally
        {
            _membership.Release();
        }
    }

    private async Task RemoveMemberAsync(IPEndPoint address, CancellationToken cancellationToken)
    {
        if (!IsMember(address))
        {
            return;
        }

        await _raft!.RemoveMemberAsync(address, cancellationToken);
    }

    private bool IsMember(IPEndPoint address) => _raft!.Members.Any(m => address.Equals(m.EndPoint));

    [LoggerMessage(Level = LogLevel.Information, Message = "Added the replica on {Node} at {Address} to the cluster")]
    private partial void LogAdmitted(string node, string address);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Removed the replica on {Node} at {Address} from the cluster, as an administrator asked")]
    private partial void LogRemoved(string node, string address);

    [LoggerMessage(Level = LogLevel.Warning, Message = "This replica was removed from the cluster while it was unreachable. Apiary stops now, and joins again as a new replica when it restarts")]
    private partial void LogRemovedFromCluster();

    [LoggerMessage(Level = LogLevel.Information, Message = "The replica on {Node} at {Address} left the cluster")]
    private partial void LogLeft(string node, string address);

    [LoggerMessage(Level = LogLevel.Information, Message = "Left the cluster before stopping (confirmed: {Confirmed})")]
    private partial void LogLeaving(bool confirmed);

    [LoggerMessage(Level = LogLevel.Information, Message = "Waiting for the other replicas to be ready before leaving, so the cluster keeps its majority")]
    private partial void LogWaitingForPeers();

    [LoggerMessage(Level = LogLevel.Warning, Message = "Leaving although some replicas aren't ready yet; the cluster may lose its majority until they are")]
    private partial void LogPeersNotReady();

    [LoggerMessage(Level = LogLevel.Warning, Message = "Couldn't leave the cluster cleanly before stopping")]
    private partial void LogLeaveFailed(Exception exception);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Couldn't check for missing replicas")]
    private partial void LogMonitorFailed(Exception exception);

    [LoggerMessage(Level = LogLevel.Warning, Message = "No leader for a while, and the replica on {Node} now runs at {Address}, which this replica's member list doesn't have. If replicas restarted while the cluster had no majority, restart the whole service so every replica updates its member list")]
    private partial void LogPeerMoved(string node, string address);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Still not ready, and the replica on {Node} now runs at {Address}, which this replica's member list doesn't have. Restarting to learn the replicas' new addresses")]
    private partial void LogRestartingForMovedPeer(string node, string address);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Removed the replica at {Address}, missing from Swarm for longer than the timeout")]
    private partial void LogRemovedMissing(string address);
}
