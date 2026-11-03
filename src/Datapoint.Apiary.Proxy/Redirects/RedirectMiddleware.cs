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

        if (!table.ByHost.TryGetValue(context.Request.Host.Host, out var redirect))
        {
            return next(context);
        }

        var request = context.Request;
        context.Response.StatusCode = redirect.StatusCode;
        context.Response.Headers.Location = redirect.KeepPath
            ? string.Concat(redirect.To.TrimEnd('/'), request.PathBase.ToUriComponent(), request.Path.ToUriComponent(), request.QueryString.ToUriComponent())
            : redirect.To;
        return Task.CompletedTask;
    }

    private sealed class RedirectTable(ImmutableDictionary<Guid, Redirect> source)
    {
        public ImmutableDictionary<Guid, Redirect> Source { get; } = source;

        public FrozenDictionary<string, Redirect> ByHost { get; } =
            source.Values.ToFrozenDictionary(r => r.From, StringComparer.OrdinalIgnoreCase);
    }
}
