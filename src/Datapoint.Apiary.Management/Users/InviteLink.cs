namespace Datapoint.Apiary.Management.Users;

public sealed record InviteLink(Guid UserId, string Token, DateTimeOffset ExpiresAt);
