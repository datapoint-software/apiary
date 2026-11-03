using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Proxy.Routing;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.Net.Http.Headers;

namespace Datapoint.Apiary.Proxy.Caching;

public sealed class HttpCachePolicy(IClusterState cluster) : IOutputCachePolicy
{
    public const string PolicyName = "apiary.http";

    private const string CredentialsKey = "apiary.credentials";
    private const string CanaryKey = "apiary.canary";
    private static readonly TimeSpan s_longest = TimeSpan.FromDays(1);
    private static readonly HashSet<int> s_cacheable = [200, 203, 204, 301, 308, 404, 410];

    public ValueTask CacheRequestAsync(OutputCacheContext context, CancellationToken cancellation)
    {
        var request = context.HttpContext.Request;
        var route = ProxyRoutes.Find(context.HttpContext, cluster.Current);
        var cacheable = route is { Caching: true }
            && (HttpMethods.IsGet(request.Method) || HttpMethods.IsHead(request.Method))
            && !NoCache(request.Headers.CacheControl);
        context.EnableOutputCaching = cacheable;
        context.AllowCacheLookup = cacheable;
        context.AllowCacheStorage = cacheable;
        context.AllowLocking = true;
        if (!cacheable)
        {
            return ValueTask.CompletedTask;
        }

        context.Tags.Add(route!.Id.ToString());
        context.CacheVaryByRules.QueryKeys = "*";
        context.CacheVaryByRules.HeaderNames = HeaderNames.AcceptEncoding;
        context.CacheVaryByRules.VaryByValues[CredentialsKey] = HasCredentials(request) ? "1" : "0";
        context.CacheVaryByRules.VaryByValues[CanaryKey] = CanaryMatch.Matches(route.Canary, request) ? "1" : "0";
        return ValueTask.CompletedTask;
    }

    public ValueTask ServeFromCacheAsync(OutputCacheContext context, CancellationToken cancellation) => ValueTask.CompletedTask;

    public ValueTask ServeResponseAsync(OutputCacheContext context, CancellationToken cancellation)
    {
        var response = context.HttpContext.Response;
        var lifetime = Lifetime(response.Headers.CacheControl, HasCredentials(context.HttpContext.Request));
        if (lifetime is not { } expiration
            || !s_cacheable.Contains(response.StatusCode)
            || response.Headers.SetCookie.Count > 0
            || !VariesOnlyByEncoding(response.Headers.Vary))
        {
            context.AllowCacheStorage = false;
            return ValueTask.CompletedTask;
        }

        context.ResponseExpirationTimeSpan = expiration;
        return ValueTask.CompletedTask;
    }

    private static bool HasCredentials(HttpRequest request) =>
        request.Headers.Authorization.Count > 0 || request.Headers.Cookie.Count > 0;

    private static bool NoCache(Microsoft.Extensions.Primitives.StringValues cacheControl) =>
        CacheControlHeaderValue.TryParse(cacheControl.ToString(), out var parsed) && (parsed.NoCache || parsed.NoStore);

    private static TimeSpan? Lifetime(Microsoft.Extensions.Primitives.StringValues cacheControl, bool credentials)
    {
        if (!CacheControlHeaderValue.TryParse(cacheControl.ToString(), out var parsed) || !Allows(parsed, credentials))
        {
            return null;
        }

        return (parsed.SharedMaxAge ?? parsed.MaxAge) is { } age && age > TimeSpan.Zero
            ? (age < s_longest ? age : s_longest)
            : null;
    }

    private static bool Allows(CacheControlHeaderValue cacheControl, bool credentials) =>
        !cacheControl.NoStore && !cacheControl.NoCache && !cacheControl.Private && (!credentials || cacheControl.Public);

    private static bool VariesOnlyByEncoding(Microsoft.Extensions.Primitives.StringValues vary) =>
        vary.SelectMany(v => (v ?? string.Empty).Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            .All(name => string.Equals(name, HeaderNames.AcceptEncoding, StringComparison.OrdinalIgnoreCase));
}
