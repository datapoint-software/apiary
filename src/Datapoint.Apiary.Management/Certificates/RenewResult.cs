namespace Datapoint.Apiary.Management.Certificates;

public sealed record RenewResult(bool Renewed, DateTimeOffset? NotAfter, string? FailureCode, string? FailureDetail);
