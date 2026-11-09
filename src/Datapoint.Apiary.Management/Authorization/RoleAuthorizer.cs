using System.Reflection;
using System.Security.Claims;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Authorization;

public sealed class RoleAuthorizer<TAction> : IAuthorizer<TAction>
{
    private static readonly Role? s_required = typeof(TAction).GetCustomAttribute<RequiresRoleAttribute>()?.Role;

    public ValueTask<AuthorizationDecision> AuthorizeAsync(TAction action, ClaimsPrincipal principal, CancellationToken cancellationToken = default) =>
        new(AuthorizationDecision.AllowIf(action is IStackPipelineAction pipeline ? IsPipelineFor(principal, pipeline.Stack) : s_required is { } required && HasRole(principal, required)));

    private static bool IsPipelineFor(ClaimsPrincipal principal, string stack) =>
        principal.FindFirstValue(ApiaryClaims.Stack) is { } allowed && string.Equals(allowed, stack, StringComparison.Ordinal);

    private static bool HasRole(ClaimsPrincipal principal, Role required) =>
        Enum.TryParse<Role>(principal.FindFirstValue(ClaimTypes.Role), out var role) && role >= required;
}
