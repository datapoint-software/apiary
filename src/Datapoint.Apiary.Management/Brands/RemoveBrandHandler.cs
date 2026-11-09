using Datapoint.Apiary.Cluster.Brands;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Brands;

public sealed class RemoveBrandHandler(StateTransaction transaction) : ICommandHandler<RemoveBrand>
{
    public ValueTask HandleAsync(RemoveBrand command, CancellationToken cancellationToken = default)
    {
        if (command.ProjectId is { } projectId && !transaction.State.Projects.ContainsKey(projectId))
        {
            throw ActionFailedException.NotFound(ErrorCodes.ProjectNotFound);
        }

        transaction.Record(new BrandSaved(command.ProjectId, null));
        if (command.ProjectId is { } id)
        {
            transaction.Affects(id, id);
        }

        return ValueTask.CompletedTask;
    }
}
