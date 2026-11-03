using System.Security.Claims;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Accounts;

public sealed class CurrentUser(IPrincipalAccessor principals)
{
    public Guid? UserId => Guid.TryParse(principals.Principal?.FindFirstValue(ApiaryClaims.UserId), out var id) ? id : null;

    public Guid? SessionId => Guid.TryParse(principals.Principal?.FindFirstValue(ApiaryClaims.SessionId), out var id) ? id : null;

    public bool IsLocalOperator => principals.Principal?.HasClaim(c => c.Type == ApiaryClaims.Local) == true;

    public User Require(ApiaryState state) =>
        UserId is { } id && state.Users.TryGetValue(id, out var user)
            ? user
            : throw ActionFailedException.NotFound(ErrorCodes.UserNotFound);
}
