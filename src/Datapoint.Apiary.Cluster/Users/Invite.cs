namespace Datapoint.Apiary.Cluster.Users;

public sealed record Invite(string TokenHash, DateTimeOffset ExpiresAt);
