using Datapoint.Apiary.Cluster.Stacks;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Stacks;

public sealed class AddStackWithTokenHandler(StateTransaction transaction, TimeProvider time, IPrincipalAccessor principals)
    : ICommandHandler<AddStackWithToken, NewPipelineToken>
{
    public ValueTask<NewPipelineToken> HandleAsync(AddStackWithToken command, CancellationToken cancellationToken = default)
    {
        var now = time.GetUtcNow();
        var by = principals.Principal?.Identity?.Name;
        var stack = new StackRecord(command.Name.Trim(), command.ProjectId, now, by);
        var (token, value) = PipelineTokens.Create(command.TokenName, stack.Name, command.TokenDays, now, by);
        transaction.Record(new StackSaved(stack));
        transaction.Record(new PipelineTokenSaved(token));
        transaction.AffectsName(stack.Name);
        transaction.AffectsName(token.Name);
        return new(new NewPipelineToken(token.Id, token.Name, token.Stack, value, token.ExpiresAt));
    }
}
