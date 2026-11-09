using Datapoint.Apiary.Cluster.Projects;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Projects;

public sealed class UpdateProjectHandler(StateTransaction transaction) : ICommandHandler<UpdateProject>
{
    public ValueTask HandleAsync(UpdateProject command, CancellationToken cancellationToken = default)
    {
        if (!transaction.State.Projects.TryGetValue(command.Id, out var existing))
        {
            throw ActionFailedException.NotFound(ErrorCodes.ProjectNotFound);
        }

        var project = existing with { Name = command.Name.Trim(), Description = command.Description.Trim(), Icon = command.Icon };
        transaction.Record(new ProjectSaved(project));
        transaction.Affects(project.Id, project.Id);
        return ValueTask.CompletedTask;
    }
}
