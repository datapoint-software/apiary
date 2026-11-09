using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Validation;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Redirects;

public sealed class CheckRedirectHandler(IClusterState cluster) : IQueryHandler<CheckRedirect, IReadOnlyList<FieldCheck>>
{
    public ValueTask<IReadOnlyList<FieldCheck>> HandleAsync(CheckRedirect query, CancellationToken cancellationToken = default)
    {
        var state = cluster.Current;
        var check = RedirectRules.IsWholeHost(query.Path) ? WholeHost(state, query.From) : AtPath(state, query.From, query.Path);
        return new(check is null ? [] : [check]);
    }

    private static FieldCheck? WholeHost(ApiaryState state, string from)
    {
        if (RedirectRules.IsRoute(state, from))
        {
            return new FieldCheck("from", ErrorCodes.RedirectRouteExists);
        }

        return RedirectRules.Exists(state, from, path: null) ? new FieldCheck("from", ErrorCodes.RedirectDuplicate) : null;
    }

    private static FieldCheck? AtPath(ApiaryState state, string from, string? path)
    {
        if (RedirectRules.HidesRoute(state, from, path))
        {
            return new FieldCheck("path", ErrorCodes.RedirectHidesRoute);
        }

        return RedirectRules.Exists(state, from, path) ? new FieldCheck("path", ErrorCodes.RedirectDuplicate) : null;
    }
}
