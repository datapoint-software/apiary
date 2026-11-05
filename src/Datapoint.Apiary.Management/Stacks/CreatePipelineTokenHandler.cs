using Datapoint.Apiary.Cluster.Stacks;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Stacks;

public sealed class CreatePipelineTokenHandler(StateTransaction transaction, TimeProvider time, IPrincipalAccessor principals)
    : ICommandHandler<CreatePipelineToken, NewPipelineToken>
{
    public ValueTask<NewPipelineToken> HandleAsync(CreatePipelineToken command, CancellationToken ct = default)
    {
        if (!transaction.State.Stacks.ContainsKey(command.Stack))
        {
            throw ActionFailedException.NotFound(ErrorCodes.StackNotFound);
        }

        var (token, value) = PipelineTokens.Create(command.Name, command.Stack, command.Days, time.GetUtcNow(), principals.Principal?.Identity?.Name);
        transaction.Record(new PipelineTokenSaved(token));
        transaction.AffectsName(token.Name);
        return new(new NewPipelineToken(token.Id, token.Name, token.Stack, value, token.ExpiresAt));
    }
}
