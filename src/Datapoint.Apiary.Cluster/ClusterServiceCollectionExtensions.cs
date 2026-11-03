using Datapoint.Apiary.Cluster.State;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Datapoint.Apiary.Cluster;

public static class ClusterServiceCollectionExtensions
{
    public static IServiceCollection AddApiaryCluster(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<ClusterOptions>(configuration);
        services.AddSingleton<LocalClusterState>();
        services.AddSingleton<IClusterState>(provider => provider.GetRequiredService<LocalClusterState>());
        services.AddHostedService<ClusterStateLoader>();
        return services;
    }
}
