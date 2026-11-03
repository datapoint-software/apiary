using Datapoint.Apiary.Cluster.State;
using FluentValidation;

namespace Datapoint.Apiary.Management.Projects;

public sealed class UpdateProjectValidator : AbstractValidator<UpdateProject>
{
    public UpdateProjectValidator(IClusterState cluster) => this.AddProjectRules(cluster, p => p.Id);
}
