using Datapoint.Apiary.Auth;
using Datapoint.Apiary.Cluster.Raft;
using Datapoint.Apiary.Management.Setup;
using Microsoft.Extensions.Options;

namespace Datapoint.Apiary.Hosting;

public sealed partial class StartupTasks(
    RaftClusterState cluster,
    LocalOperatorToken operatorToken,
    SetupWindow setup,
    IOptions<ApiaryOptions> options,
    ILogger<StartupTasks> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await operatorToken.WriteAsync(stoppingToken);
        await cluster.WaitUntilReadyAsync(stoppingToken);
        if (!setup.IsOpen(cluster.Current))
        {
            return;
        }

        LogSetupOpen(Environment.MachineName, options.Value.AdminPort, setup.ClosesAt);
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "Waiting for setup at http://{Host}:{Port} until {ClosesAt:HH:mm} UTC. Whoever opens it first creates the first administrator.")]
    private partial void LogSetupOpen(string host, int port, DateTimeOffset closesAt);
}
