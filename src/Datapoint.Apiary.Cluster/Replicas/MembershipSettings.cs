namespace Datapoint.Apiary.Cluster.Replicas;

public sealed record MembershipSettings(MembershipMode Mode, int RemoveMissingAfterMinutes);
