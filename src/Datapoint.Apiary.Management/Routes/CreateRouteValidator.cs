using Datapoint.Apiary.Cluster.State;
using FluentValidation;

namespace Datapoint.Apiary.Management.Routes;

public sealed class CreateRouteValidator : AbstractValidator<CreateRoute>
{
    public CreateRouteValidator(IClusterState cluster) => this.AddRouteRules(cluster, _ => null);
}
