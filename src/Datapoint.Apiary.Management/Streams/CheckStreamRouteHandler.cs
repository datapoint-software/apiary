using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Validation;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Streams;

public sealed class CheckStreamRouteHandler(IClusterState cluster, StreamPortPolicy ports) : IQueryHandler<CheckStreamRoute, IReadOnlyList<FieldCheck>>
{
    public ValueTask<IReadOnlyList<FieldCheck>> HandleAsync(CheckStreamRoute query, CancellationToken cancellationToken = default)
    {
        var fields = new UpdateStreamRoute(query.Id ?? Guid.Empty, Guid.Empty, string.Empty, query.Protocol, query.ListenPort, string.Empty, 0, query.ServerNames);
        var code = ports.Reserved.Contains(query.ListenPort) ? ErrorCodes.StreamPortReserved
            : StreamRules.Clash(cluster.Current, fields, query.Id) is not null ? ErrorCodes.StreamPortTaken
            : null;
        return new(code is null ? [] : [new FieldCheck("listenPort", code)]);
    }
}
