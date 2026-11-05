using Datapoint.Apiary.Cluster.Stacks;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Stacks;

public sealed class RevokePipelineTokenHandler(StateTransaction transaction) : ICommandHandler<RevokePipelineToken>
{
    public ValueTask HandleAsync(RevokePipelineToken command, CancellationToken ct = default)
    {
        if (!transaction.State.PipelineTokens.TryGetValue(command.Id, out var token))
        {
            throw ActionFailedException.NotFound(ErrorCodes.PipelineTokenNotFound);
        }

        transaction.Record(new PipelineTokenRevoked(token.Id));
        transaction.AffectsName(token.Name);
        return ValueTask.CompletedTask;
    }
}
