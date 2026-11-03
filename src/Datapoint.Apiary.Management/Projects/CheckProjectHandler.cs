using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Validation;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Projects;

public sealed class CheckProjectHandler(IClusterState cluster) : IQueryHandler<CheckProject, IReadOnlyList<FieldCheck>>
{
    public ValueTask<IReadOnlyList<FieldCheck>> HandleAsync(CheckProject query, CancellationToken ct = default) =>
        new(ProjectRules.IsTaken(cluster.Current, query.Name, query.Id) ? [new FieldCheck("name", ErrorCodes.ProjectNameTaken)] : []);
}
