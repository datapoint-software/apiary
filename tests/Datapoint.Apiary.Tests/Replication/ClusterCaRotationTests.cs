using Datapoint.Apiary.Cluster.Projects;
using Datapoint.Apiary.Testing;
using Datapoint.Apiary.Tests.Hosting;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Tests.Replication;

public sealed class ClusterCaRotationTests : IAsyncLifetime
{
    private static readonly TimeSpan s_firstRotation = TimeSpan.FromSeconds(90);
    private SwarmReplicas _swarm = null!;

    public async ValueTask InitializeAsync() =>
        _swarm = await SwarmReplicas.StartAsync(3, new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["Apiary:ClusterCaRenewBefore"] = "729.23:59:20",
            ["Apiary:ClusterCaOverlap"] = "00:00:02",
        });

    public async ValueTask DisposeAsync() => await _swarm.DisposeAsync();

    [Fact]
    public async Task The_cluster_ca_rotates_and_the_replicas_keep_talking()
    {
        var first = _swarm.Leader.State.ClusterCa!.CertificatePem;
        var project = AProject("After the CA rotated");

        Assert.True(await Eventually.TrueAsync(() => _swarm.Running.All(r => r.State.ClusterCa!.CertificatePem != first && r.State.RetiringClusterCa is null), s_firstRotation));
        await _swarm.Leader.SeedAsync(new ProjectSaved(project));

        Assert.True(await Eventually.TrueAsync(() => _swarm.Running.All(r => r.State.Projects.ContainsKey(project.Id))));
    }
}
