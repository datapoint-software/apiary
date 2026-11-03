using System.Runtime.CompilerServices;
using Yarp.ReverseProxy.Health;
using Yarp.ReverseProxy.Model;

namespace Datapoint.Apiary.Proxy.Health;

public sealed class ReachablePolicy(IDestinationHealthUpdater health) : IActiveHealthCheckPolicy
{
    public const string PolicyName = "ApiaryReachable";
    public const int FailuresBeforeUnhealthy = 2;
    private readonly ConditionalWeakTable<DestinationState, StrongBox<int>> _failures = [];

    public string Name => PolicyName;

    public void ProbingCompleted(ClusterState cluster, IReadOnlyList<DestinationProbingResult> probingResults)
    {
        if (probingResults.Count == 0)
        {
            return;
        }

        var results = new NewActiveDestinationHealth[probingResults.Count];
        for (var i = 0; i < probingResults.Count; i++)
        {
            var result = probingResults[i];
            results[i] = new NewActiveDestinationHealth(result.Destination, Judge(result));
        }

        health.SetActive(cluster, results);
    }

    private DestinationHealth Judge(DestinationProbingResult result)
    {
        var failures = _failures.GetValue(result.Destination, static _ => new StrongBox<int>());
        if (result.Response is not null)
        {
            failures.Value = 0;
            return DestinationHealth.Healthy;
        }

        failures.Value++;
        return failures.Value >= FailuresBeforeUnhealthy ? DestinationHealth.Unhealthy : result.Destination.Health.Active;
    }
}
