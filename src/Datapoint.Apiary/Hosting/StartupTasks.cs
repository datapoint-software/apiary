using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Projects;

namespace Datapoint.Apiary.Hosting;

public sealed class StartupTasks(IClusterState cluster, TimeProvider time) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken) =>
        await DefaultProject.EnsureAsync(cluster, time, cancellationToken);

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
