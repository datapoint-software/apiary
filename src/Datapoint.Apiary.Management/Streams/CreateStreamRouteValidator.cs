using Datapoint.Apiary.Cluster.State;
using FluentValidation;

namespace Datapoint.Apiary.Management.Streams;

public sealed class CreateStreamRouteValidator : AbstractValidator<CreateStreamRoute>
{
    public CreateStreamRouteValidator(IClusterState cluster, StreamPortPolicy ports) => this.AddStreamRules(cluster, ports, _ => null);
}
