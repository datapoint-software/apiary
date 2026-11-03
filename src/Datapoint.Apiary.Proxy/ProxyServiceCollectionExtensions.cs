using Datapoint.Apiary.Proxy.AccessLogs;
using Datapoint.Apiary.Proxy.Network;
using Datapoint.Apiary.Proxy.Routing;
using Microsoft.Extensions.DependencyInjection;
using Yarp.ReverseProxy.Configuration;
using Yarp.ReverseProxy.Forwarder;

namespace Datapoint.Apiary.Proxy;

public static class ProxyServiceCollectionExtensions
{
    public static IServiceCollection AddApiaryProxy(this IServiceCollection services, IReadOnlySet<int> ownPorts)
    {
        services.AddSingleton(new OwnEndpoints(ownPorts));
        services.AddSingleton<TargetConnector>();
        services.AddSingleton<IForwarderHttpClientFactory, GuardedForwarderHttpClientFactory>();
        services.AddSingleton<IProxyConfigProvider, StateProxyConfigProvider>();
        services.AddSingleton<AddressAllowlists>();
        services.AddSingleton<AccessLogWriter>();
        services.AddHostedService(provider => provider.GetRequiredService<AccessLogWriter>());
        services.AddReverseProxy();
        return services;
    }
}
