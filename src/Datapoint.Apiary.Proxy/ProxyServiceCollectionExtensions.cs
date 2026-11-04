using System.IO.Compression;
using Datapoint.Apiary.Proxy.AccessLogs;
using Datapoint.Apiary.Proxy.Caching;
using Datapoint.Apiary.Proxy.Health;
using Datapoint.Apiary.Proxy.Network;
using Datapoint.Apiary.Proxy.Pages;
using Datapoint.Apiary.Proxy.Passwords;
using Datapoint.Apiary.Proxy.RateLimits;
using Datapoint.Apiary.Proxy.Routing;
using Datapoint.Apiary.Proxy.Streams;
using Datapoint.Apiary.Proxy.Telemetry;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Yarp.ReverseProxy.Configuration;
using Yarp.ReverseProxy.Forwarder;
using Yarp.ReverseProxy.Health;
using Yarp.ReverseProxy.LoadBalancing;
using Yarp.ReverseProxy.Transforms;

namespace Datapoint.Apiary.Proxy;

public static class ProxyServiceCollectionExtensions
{
    private const long CacheSizeLimit = 256L * 1024 * 1024;
    private const long CacheMaximumBody = 8L * 1024 * 1024;

    public static IServiceCollection AddApiaryProxy(this IServiceCollection services, IReadOnlySet<int> ownPorts, IReadOnlySet<int> internalPorts, IReadOnlySet<string> adminCookies, IConfiguration accessLogs, IConfiguration visitorPages)
    {
        services.Configure<AccessLogOptions>(accessLogs);
        services.Configure<VisitorPageOptions>(visitorPages);
        services.AddSingleton<PublicPages>();
        services.AddSingleton(new OwnEndpoints(ownPorts, internalPorts));
        services.AddSingleton<TargetConnector>();
        services.AddSingleton<IForwarderHttpClientFactory, GuardedForwarderHttpClientFactory>();
        services.AddSingleton<IProxyConfigProvider, StateProxyConfigProvider>();
        services.AddSingleton<AddressAllowlists>();
        services.AddSingleton<ClientRateLimiter>();
        services.AddSingleton<PasswordGate>();
        services.AddSingleton<AccessLogWriter>();
        services.AddSingleton<ProxyMetrics>();
        services.AddSingleton<RouteTelemetrySource>();
        services.AddSingleton<IActiveHealthCheckPolicy, ReachablePolicy>();
        services.AddSingleton<ILoadBalancingPolicy, WeightedPolicy>();
        services.AddHostedService(provider => provider.GetRequiredService<AccessLogWriter>());
        services.AddHostedService<RouteCacheEvictor>();
        services.AddSingleton<StreamConnections>();
        services.AddHostedService<StreamListeners>();
        services.AddSingleton<HttpCachePolicy>();
        services.AddOutputCache(o =>
        {
            o.SizeLimit = CacheSizeLimit;
            o.MaximumBodySize = CacheMaximumBody;
            o.UseCaseSensitivePaths = true;
        });
        services.AddOptions<OutputCacheOptions>()
            .Configure<HttpCachePolicy>((o, policy) => o.AddPolicy(HttpCachePolicy.PolicyName, policy));
        services.AddResponseCompression(o =>
        {
            o.EnableForHttps = true;
            o.Providers.Add<BrotliCompressionProvider>();
            o.Providers.Add<GzipCompressionProvider>();
            o.MimeTypes = ResponseCompressionDefaults.MimeTypes.Append("image/svg+xml");
        });
        services.Configure<BrotliCompressionProviderOptions>(o => o.Level = CompressionLevel.Fastest);
        services.Configure<GzipCompressionProviderOptions>(o => o.Level = CompressionLevel.Fastest);
        services.AddReverseProxy()
            .AddTransforms(context => context.AddOriginalHost())
            .AddTransforms(new ApiaryCookieFilter(adminCookies).Apply);
        return services;
    }
}
