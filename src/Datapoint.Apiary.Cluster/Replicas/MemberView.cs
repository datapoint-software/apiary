namespace Datapoint.Apiary.Cluster.Replicas;

public sealed record MemberView(Guid? Id, string? Node, string Address, MemberRole Role, bool Reachable, bool Local, DateTimeOffset? JoinedAt, DateTimeOffset? MissingSince);
