using Datapoint.Apiary.Cluster.Raft;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Keys;

public sealed class GetRootKeyStatusHandler(RaftClusterState cluster) : IQueryHandler<GetRootKeyStatus, RootKeyStatus>
{
    public ValueTask<RootKeyStatus> HandleAsync(GetRootKeyStatus query, CancellationToken ct = default)
    {
        var state = cluster.Current;
        var current = cluster.RootKeyId;
        var newest = state.RootKeys.Count > 1 ? state.RootKeys.MaxBy(k => k.AddedAt) : null;
        var replicas = state.Replicas.Values
            .OrderBy(r => r.Node, StringComparer.Ordinal)
            .Select(r => new ReplicaRootKey(r.Id, r.Node, r.RootKeyId))
            .ToList();
        return new(new RootKeyStatus(
            current,
            state.RootKeys.FirstOrDefault(k => k.Keys.RootKeyId == current)?.AddedAt,
            newest?.Keys.RootKeyId,
            newest?.AddedAt,
            replicas));
    }
}
