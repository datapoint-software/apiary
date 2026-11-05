using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Stacks;
using FluentValidation;

namespace Datapoint.Apiary.Management.Streams;

public sealed class UpdateStreamRouteValidator : AbstractValidator<UpdateStreamRoute>
{
    public UpdateStreamRouteValidator(IClusterState cluster, StreamPortPolicy ports)
    {
        this.AddStreamRules(cluster, ports, s => s.Id);
        this.AddStreamLocks(cluster);
    }
}
