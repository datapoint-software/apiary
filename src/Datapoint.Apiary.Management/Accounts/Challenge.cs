namespace Datapoint.Apiary.Management.Accounts;

public sealed record Challenge(ChallengePurpose Purpose, Guid? UserId, string Email, string? Secret, DateTimeOffset ExpiresAt);
