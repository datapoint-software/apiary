namespace Datapoint.Apiary.Cluster.Replicas;

public sealed record ClusterView(string Mode, bool Ready, bool Writable, long Index, Guid? ReplicaId, IReadOnlyList<MemberView> Members);
