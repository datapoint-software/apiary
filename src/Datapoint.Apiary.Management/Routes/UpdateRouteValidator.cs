using Datapoint.Apiary.Cluster.State;
using FluentValidation;

namespace Datapoint.Apiary.Management.Routes;

public sealed class UpdateRouteValidator : AbstractValidator<UpdateRoute>
{
    public UpdateRouteValidator(IClusterState cluster) => this.AddRouteRules(cluster, r => r.Id);
}
