using Datapoint.Apiary.Proxy.AccessLogs;
using Datapoint.Apiary.Proxy.Health;
using Datapoint.Apiary.Proxy.Network;
using Datapoint.Apiary.Proxy.Routing;
using Datapoint.Apiary.Proxy.Telemetry;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Yarp.ReverseProxy.Configuration;
using Yarp.ReverseProxy.Forwarder;
using Yarp.ReverseProxy.Health;

namespace Datapoint.Apiary.Proxy;

public static class ProxyServiceCollectionExtensions
{
    public static IServiceCollection AddApiaryProxy(this IServiceCollection services, IReadOnlySet<int> ownPorts, IConfiguration accessLogs)
    {
        services.Configure<AccessLogOptions>(accessLogs);
        services.AddSingleton(new OwnEndpoints(ownPorts));
        services.AddSingleton<TargetConnector>();
        services.AddSingleton<IForwarderHttpClientFactory, GuardedForwarderHttpClientFactory>();
        services.AddSingleton<IProxyConfigProvider, StateProxyConfigProvider>();
        services.AddSingleton<AddressAllowlists>();
        services.AddSingleton<AccessLogWriter>();
        services.AddSingleton<ProxyMetrics>();
        services.AddSingleton<RouteTelemetrySource>();
        services.AddSingleton<IActiveHealthCheckPolicy, ReachablePolicy>();
        services.AddHostedService(provider => provider.GetRequiredService<AccessLogWriter>());
        services.AddReverseProxy();
        return services;
    }
}
