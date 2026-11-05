using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Redirects;
using Datapoint.Apiary.Management.Validation;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Routes;

public sealed class CheckRouteHandler(IClusterState cluster) : IQueryHandler<CheckRoute, IReadOnlyList<FieldCheck>>
{
    public ValueTask<IReadOnlyList<FieldCheck>> HandleAsync(CheckRoute query, CancellationToken ct = default)
    {
        var state = cluster.Current;
        List<FieldCheck> checks = [];
        if (RedirectRules.RedirectsWholeHost(state, query.Host))
        {
            checks.Add(new("host", ErrorCodes.RouteRedirectExists));
        }

        if (RedirectRules.RedirectsRoutePath(state, query.Host, query.Path))
        {
            checks.Add(new("path", ErrorCodes.RoutePathRedirected));
        }

        if (RouteRules.IsDuplicate(state, query.Host, query.Path, query.Id))
        {
            checks.Add(new("path", ErrorCodes.RouteDuplicate));
        }

        return new(checks);
    }
}
