namespace Datapoint.Apiary.Cluster.Join;

public sealed record ReplicaAnnouncement(Guid ReplicaId, string Node, string Address, int? Schema = null, JoinKeys? RootKey = null);
