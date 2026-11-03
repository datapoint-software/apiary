using Microsoft.Extensions.Hosting;

namespace Datapoint.Apiary.Cluster.State;

public sealed class ClusterStateLoader(LocalClusterState state) : IHostedService
{
    public Task StartAsync(CancellationToken cancellationToken) => state.LoadAsync(cancellationToken);

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
