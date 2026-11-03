namespace Datapoint.Apiary.Cluster.Acme;

public sealed record AcmeChallenge(string Token, string KeyAuthorization, string Host, DateTimeOffset ExpiresAt);
