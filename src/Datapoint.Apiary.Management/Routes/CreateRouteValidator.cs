using Datapoint.Apiary.Cluster.State;
using FluentValidation;

namespace Datapoint.Apiary.Management.Routes;

public sealed class CreateRouteValidator : AbstractValidator<CreateRoute>
{
    public CreateRouteValidator(IClusterState cluster, TimeProvider time) => this.AddRouteRules(cluster, time, _ => null);
}
