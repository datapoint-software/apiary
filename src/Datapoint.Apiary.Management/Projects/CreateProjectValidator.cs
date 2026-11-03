using Datapoint.Apiary.Cluster.State;
using FluentValidation;

namespace Datapoint.Apiary.Management.Projects;

public sealed class CreateProjectValidator : AbstractValidator<CreateProject>
{
    public CreateProjectValidator(IClusterState cluster) => this.AddProjectRules(cluster, _ => null);
}
