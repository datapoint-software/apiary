using System.Net;
using Datapoint.Apiary.Cluster.Replicas;
using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Raft;

// What a replica without a leader learns from the others' views: whether it was removed, and which
// peers now run at addresses its member list doesn't have.
public static class MovedPeers
{
    // A replica that was never a member, still waiting to be admitted, isn't removed.
    public static bool IsRemoved(ClusterView? view, ApiaryState state, Guid? self, string? ownAddress) =>
        view is not null
        && self is { } id
        && state.Replicas.ContainsKey(id)
        && view.Members.Any(m => m.Role is MemberRole.Leader)
        && view.Members.All(m => m.Address != ownAddress && m.Id != id);

    public static Replica? Moved(ClusterView? view, ApiaryState state, IReadOnlyCollection<IPEndPoint> members)
    {
        var address = view?.Members.FirstOrDefault(m => m.Local)?.Address;
        if (view?.ReplicaId is not { } id || address is null || !state.Replicas.TryGetValue(id, out var known))
        {
            return null;
        }

        return IPEndPoint.TryParse(address, out var endPoint) && !members.Contains(endPoint) ? known with { Address = address } : null;
    }

    // A moved peer replaces its own former address when this replica knows which one that was. Otherwise
    // it replaces an address no running task has: the list may have learned it from a leader, without
    // knowing whose it was. The number of members stays the same either way, so the voters are the
    // running replicas even when it can't tell which old address belonged to which.
    public static IReadOnlyDictionary<IPEndPoint, Replica> Pair(
        IReadOnlyList<Replica> moved,
        ApiaryState state,
        AddressHistory history,
        IReadOnlyList<IPEndPoint> peers,
        IReadOnlyCollection<IPAddress> running)
    {
        var moves = new Dictionary<IPEndPoint, Replica>();
        var unmatched = new List<Replica>();
        foreach (var replica in moved)
        {
            if (FormerAddress(replica.Id, state, history, peers) is { } former)
            {
                moves[former] = replica;
            }
            else
            {
                unmatched.Add(replica);
            }
        }

        var gone = peers.Where(e => !running.Contains(e.Address) && !moves.ContainsKey(e));
        foreach (var (former, replica) in gone.Zip(unmatched))
        {
            moves[former] = replica;
        }

        return moves;
    }

    public static IPEndPoint? FormerAddress(Guid replicaId, ApiaryState state, AddressHistory history, IEnumerable<IPEndPoint> peers)
    {
        var known = state.Replicas.GetValueOrDefault(replicaId)?.Address;
        return peers.FirstOrDefault(e => e.ToString() == known || history.ReplicaAt(e.ToString()) == replicaId);
    }
}
