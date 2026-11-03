namespace Datapoint.Apiary.Certificates.Acme;

public sealed record AcmeAuthorization(string Status, AcmeIdentifier Identifier, IReadOnlyList<AcmeChallengeResource> Challenges);
