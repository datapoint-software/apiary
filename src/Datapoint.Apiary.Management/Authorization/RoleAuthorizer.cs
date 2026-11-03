using System.Reflection;
using System.Security.Claims;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Authorization;

public sealed class RoleAuthorizer<TAction> : IAuthorizer<TAction>
{
    private static readonly Role? s_required = typeof(TAction).GetCustomAttribute<RequiresRoleAttribute>()?.Role;

    public ValueTask<AuthorizationDecision> AuthorizeAsync(TAction action, ClaimsPrincipal principal, CancellationToken ct = default) =>
        new(AuthorizationDecision.AllowIf(s_required is { } required && HasRole(principal, required)));

    private static bool HasRole(ClaimsPrincipal principal, Role required) =>
        Enum.TryParse<Role>(principal.FindFirstValue(ClaimTypes.Role), out var role) && role >= required;
}
