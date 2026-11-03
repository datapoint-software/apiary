using Datapoint.Apiary.Cluster.State;
using FluentValidation;

namespace Datapoint.Apiary.Management.Routes;

public sealed class UpdateRouteValidator : AbstractValidator<UpdateRoute>
{
    public UpdateRouteValidator(IClusterState cluster, TimeProvider time) => this.AddRouteRules(cluster, time, r => r.Id);
}
