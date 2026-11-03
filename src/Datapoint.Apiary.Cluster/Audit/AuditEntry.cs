namespace Datapoint.Apiary.Cluster.Audit;

public sealed record AuditEntry(
    Guid Id,
    DateTimeOffset At,
    string? User,
    string? Client,
    string? Address,
    string Action,
    IReadOnlyList<string> Affected,
    Guid? ProjectId,
    AuditOutcome Outcome);
