using System.Security.Claims;
using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Audit;

public sealed class AuthorizationAuditor(AuditLog audit) : IAuthorizationObserver
{
    public async ValueTask OnAuthorizedAsync(AuthorizationEvent authorization, CancellationToken ct = default)
    {
        if (authorization.Outcome is not AuthorizationOutcome.Denied)
        {
            return;
        }

        var action = StateTransactionBehavior.ActionName(authorization.Action.GetType());
        await audit.RecordAsync(action, AuditOutcome.Denied, authorization.Principal?.FindFirstValue(ClaimTypes.Name), [], ct);
    }
}
