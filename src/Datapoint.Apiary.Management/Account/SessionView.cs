namespace Datapoint.Apiary.Management.Account;

public sealed record SessionView(Guid Id, string? Device, string? Address, DateTimeOffset StartedAt, DateTimeOffset ExpiresAt, bool Current);
