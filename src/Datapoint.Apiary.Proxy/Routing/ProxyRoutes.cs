using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.State;
using Microsoft.AspNetCore.Http;

namespace Datapoint.Apiary.Proxy.Routing;

public static class ProxyRoutes
{
    public static Route? Find(HttpContext context, ApiaryState state)
    {
        var metadata = context.GetReverseProxyFeature().Route.Config.Metadata;
        return metadata is not null && metadata.TryGetValue(ProxyConfigBuilder.RouteIdMetadata, out var value)
            && Guid.TryParse(value, out var id) && state.Routes.TryGetValue(id, out var route)
            ? route
            : null;
    }
}
