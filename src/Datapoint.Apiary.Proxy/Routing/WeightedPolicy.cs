using System.Globalization;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Http;
using Yarp.ReverseProxy.LoadBalancing;
using Yarp.ReverseProxy.Model;

namespace Datapoint.Apiary.Proxy.Routing;

public sealed class WeightedPolicy : ILoadBalancingPolicy
{
    public const string PolicyName = "ApiaryWeighted";
    public const string WeightMetadata = "apiary.weight";

    public string Name => PolicyName;

    public DestinationState? PickDestination(HttpContext context, ClusterState cluster, IReadOnlyList<DestinationState> availableDestinations)
    {
        if (availableDestinations.Count <= 1)
        {
            return availableDestinations.Count == 1 ? availableDestinations[0] : null;
        }

        var weights = availableDestinations.Select(Weight).ToArray();
        var total = weights.Sum();
        if (total == 0)
        {
            return availableDestinations[RandomNumberGenerator.GetInt32(availableDestinations.Count)];
        }

        var pick = RandomNumberGenerator.GetInt32(total);
        for (var i = 0; i < weights.Length; i++)
        {
            pick -= weights[i];
            if (pick < 0)
            {
                return availableDestinations[i];
            }
        }

        return availableDestinations[^1];
    }

    private static int Weight(DestinationState destination) =>
        destination.Model.Config.Metadata?.TryGetValue(WeightMetadata, out var value) == true
        && int.TryParse(value, NumberStyles.None, CultureInfo.InvariantCulture, out var weight)
            ? weight
            : 1;
}
