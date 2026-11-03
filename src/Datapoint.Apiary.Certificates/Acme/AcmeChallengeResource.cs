namespace Datapoint.Apiary.Certificates.Acme;

public sealed record AcmeChallengeResource(string Type, Uri Url, string? Token, string? Status, AcmeProblem? Error);
