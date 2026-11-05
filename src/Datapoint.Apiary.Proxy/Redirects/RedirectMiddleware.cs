using System.Collections.Frozen;
using System.Collections.Immutable;
using Datapoint.Apiary.Cluster.Redirects;
using Datapoint.Apiary.Cluster.State;
using Microsoft.AspNetCore.Http;

namespace Datapoint.Apiary.Proxy.Redirects;

public sealed class RedirectMiddleware(RequestDelegate next, IClusterState cluster)
{
    private RedirectTable _table = new(ImmutableDictionary<Guid, Redirect>.Empty);

    public Task InvokeAsync(HttpContext context)
    {
        var redirects = cluster.Current.Redirects;
        if (redirects.IsEmpty)
        {
            return next(context);
        }

        var table = _table;
        if (!ReferenceEquals(table.Source, redirects))
        {
            table = new RedirectTable(redirects);
            _table = table;
        }

        var request = context.Request;
        if (!table.ByHost.TryGetValue(request.Host.Host, out var candidates) || Match(candidates, request.Path) is not { } match)
        {
            return next(context);
        }

        context.Response.StatusCode = match.Redirect.StatusCode;
        context.Response.Headers.Location = Location(match.Redirect, match.Remainder, request);
        return Task.CompletedTask;
    }

    private static (Redirect Redirect, PathString Remainder)? Match(Redirect[] candidates, PathString path)
    {
        foreach (var redirect in candidates)
        {
            if (redirect.Path == Redirect.WholeHost)
            {
                return (redirect, path);
            }

            if (path.StartsWithSegments(redirect.Path, StringComparison.OrdinalIgnoreCase, out var remainder))
            {
                return (redirect, remainder);
            }
        }

        return null;
    }

    private static string Location(Redirect redirect, PathString remainder, HttpRequest request)
    {
        if (!redirect.KeepPath)
        {
            return redirect.To;
        }

        var keptBase = redirect.Path == Redirect.WholeHost ? request.PathBase.ToUriComponent() : string.Empty;
        var address = string.Concat(redirect.To.TrimEnd('/'), keptBase, remainder.ToUriComponent());
        return string.Concat(address.Length > 0 ? address : Redirect.WholeHost, request.QueryString.ToUriComponent());
    }

    private sealed class RedirectTable(ImmutableDictionary<Guid, Redirect> source)
    {
        public ImmutableDictionary<Guid, Redirect> Source { get; } = source;

        public FrozenDictionary<string, Redirect[]> ByHost { get; } = source.Values
            .GroupBy(r => r.From, StringComparer.OrdinalIgnoreCase)
            .ToFrozenDictionary(g => g.Key, g => g.OrderByDescending(r => r.Path.Length).ToArray(), StringComparer.OrdinalIgnoreCase);
    }
}
