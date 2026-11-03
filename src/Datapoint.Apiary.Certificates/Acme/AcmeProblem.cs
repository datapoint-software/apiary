namespace Datapoint.Apiary.Certificates.Acme;

public sealed record AcmeProblem(string? Type, string? Detail, IReadOnlyList<AcmeProblem>? Subproblems);
