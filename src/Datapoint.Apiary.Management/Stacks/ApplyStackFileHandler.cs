using System.Globalization;
using System.Security.Claims;
using Datapoint.Apiary.Cluster.Stacks;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Stacks;

public sealed class ApplyStackFileHandler(StateTransaction transaction, TimeProvider time, IPrincipalAccessor principals)
    : ICommandHandler<ApplyStackFile, StackPlan>
{
    public ValueTask<StackPlan> HandleAsync(ApplyStackFile command, CancellationToken ct = default)
    {
        var principal = principals.Principal;
        var token = principal?.FindFirstValue(ApiaryClaims.Pipeline) ?? throw ActionFailedException.Forbidden(ErrorCodes.Forbidden);
        var now = time.GetUtcNow();
        var stack = transaction.State.Stacks.GetValueOrDefault(command.Stack) ?? new StackRecord(command.Stack, null, now, null);
        var result = StackPlanner.Plan(transaction.State, stack, command, now, token);
        if (result.Conflict is { } conflict)
        {
            Refuse(command, stack with { Failure = new StackFailure(now, conflict, token, Detail(result)) }, principal!, now);
            throw new ActionFailedException(conflict, FailureKind.Conflict) { Params = result.ConflictParams, KeepsChanges = !command.DryRun };
        }

        if (command.DryRun)
        {
            return new(result.Plan);
        }

        foreach (var change in result.Changes)
        {
            transaction.Record(change);
        }

        var apply = new StackApply(now, token, command.Commit, command.PipelineUrl, result.Plan);
        Record(stack with { LastApply = apply, Failure = null }, principal!, now);
        return new(result.Plan);
    }

    private static string? Detail(StackPlanResult result) =>
        result.ConflictParams?.Values.FirstOrDefault() is { } value ? Convert.ToString(value, CultureInfo.InvariantCulture) : null;

    private void Refuse(ApplyStackFile command, StackRecord stack, ClaimsPrincipal principal, DateTimeOffset now)
    {
        if (command.DryRun)
        {
            return;
        }

        Record(stack, principal, now);
    }

    private void Record(StackRecord stack, ClaimsPrincipal principal, DateTimeOffset now)
    {
        transaction.Record(new StackSaved(stack));
        if (Guid.TryParse(principal.FindFirstValue(ApiaryClaims.PipelineTokenId), out var tokenId))
        {
            transaction.Record(new PipelineTokenUsed(tokenId, now));
        }

        transaction.AffectsName(stack.Name);
    }
}
