using System.Globalization;
using Datapoint.Apiary.Cluster.State;
using Microsoft.AspNetCore.Http;

namespace Datapoint.Apiary.Proxy.Routing;

public sealed class CanarySelector(RequestDelegate next, IClusterState cluster)
{
    public Task InvokeAsync(HttpContext context)
    {
        if (ProxyRoutes.Find(context, cluster.Current) is { Canary: { } canary } route && CanaryMatch.Matches(canary, context.Request))
        {
            var feature = context.GetReverseProxyFeature();
            var key = (route.Targets.Count - 1).ToString(CultureInfo.InvariantCulture);
            var canaries = feature.AvailableDestinations.Where(d => d.DestinationId == key).ToList();
            if (canaries.Count > 0)
            {
                feature.AvailableDestinations = canaries;
            }
        }

        return next(context);
    }
}
