using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Validation;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Redirects;

public sealed class CheckRedirectHandler(IClusterState cluster) : IQueryHandler<CheckRedirect, IReadOnlyList<FieldCheck>>
{
    public ValueTask<IReadOnlyList<FieldCheck>> HandleAsync(CheckRedirect query, CancellationToken ct = default)
    {
        var state = cluster.Current;
        var code = CreateRedirectValidator.IsRoute(state, query.From) ? ErrorCodes.RedirectRouteExists
            : CreateRedirectValidator.IsRedirect(state, query.From) ? ErrorCodes.RedirectDuplicate
            : null;
        return new(code is null ? [] : [new FieldCheck("from", code)]);
    }
}
