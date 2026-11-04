namespace Datapoint.Apiary.Cluster.Users;

public sealed record User(
    Guid Id,
    string Name,
    string Email,
    Role Role,
    UserStatus Status,
    string? PasswordHash,
    TwoStepSetup? TwoStep,
    Invite? Invite,
    DateTimeOffset CreatedAt,
    DateTimeOffset? LastSignInAt)
{
    public string? ExternalId { get; init; }

    public string? Language { get; init; }
}
