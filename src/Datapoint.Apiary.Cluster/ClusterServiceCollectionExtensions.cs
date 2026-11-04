using Datapoint.Apiary.Cluster.Join;
using Datapoint.Apiary.Cluster.Raft;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Cluster.Telemetry;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Datapoint.Apiary.Cluster;

public static class ClusterServiceCollectionExtensions
{
    public static IServiceCollection AddApiaryCluster(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<ClusterOptions>(configuration);
        services.AddSingleton<StateEncryption>();
        services.AddSingleton<JoinProtocol>();
        services.AddSingleton<Backups.BackupSealer>();
        services.AddSingleton<ClusterClient>();
        services.AddSingleton<IPeerNetwork, DockerPeerNetwork>();
        services.AddSingleton<PeerDiscovery>();
        services.AddSingleton<RaftClusterState>();
        services.AddSingleton<IClusterState>(provider => provider.GetRequiredService<RaftClusterState>());
        services.AddSingleton<ClusterMetrics>();
        services.AddHostedService(provider => provider.GetRequiredService<RaftClusterState>());
        services.AddHostedService<Keys.DataKeyRotation>();
        services.AddHostedService<Trust.ClusterCaRotation>();
        return services;
    }
}
