using Datapoint.Apiary.Cluster.Projects;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Projects;

public sealed class CreateProjectHandler(StateTransaction transaction, TimeProvider time) : ICommandHandler<CreateProject, Guid>
{
    public ValueTask<Guid> HandleAsync(CreateProject command, CancellationToken ct = default)
    {
        var project = new Project(Guid.CreateVersion7(time.GetUtcNow()), command.Name.Trim(), command.Description.Trim(), command.Icon);
        transaction.Record(new ProjectSaved(project));
        transaction.Affects(project.Id, project.Id);
        return new(project.Id);
    }
}
