using Datapoint.Apiary.Cluster.State;
using Microsoft.Extensions.Primitives;
using Yarp.ReverseProxy.Configuration;

namespace Datapoint.Apiary.Proxy.Routing;

public sealed class StateProxyConfigProvider(IClusterState cluster) : IProxyConfigProvider
{
    public IProxyConfig GetConfig() => new StateProxyConfig(cluster.Current, cluster.GetChangeToken());

    private sealed class StateProxyConfig(ApiaryState state, IChangeToken changeToken) : IProxyConfig
    {
        public IReadOnlyList<RouteConfig> Routes { get; } = ProxyConfigBuilder.BuildRoutes(state);

        public IReadOnlyList<ClusterConfig> Clusters { get; } = ProxyConfigBuilder.BuildClusters(state);

        public IChangeToken ChangeToken { get; } = changeToken;
    }
}
