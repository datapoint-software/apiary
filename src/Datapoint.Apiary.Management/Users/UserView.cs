using Datapoint.Apiary.Cluster.Users;

namespace Datapoint.Apiary.Management.Users;

public sealed record UserView(
    Guid Id,
    string Name,
    string Email,
    Role Role,
    UserStatus Status,
    bool TwoStepOn,
    DateTimeOffset? LastSignInAt,
    DateTimeOffset? InviteExpiresAt)
{
    public static UserView From(User user) => new(
        user.Id, user.Name, user.Email, user.Role, user.Status, user.TwoStep is not null, user.LastSignInAt, user.Invite?.ExpiresAt);
}
