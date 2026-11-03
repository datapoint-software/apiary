using Datapoint.Apiary.Auth;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Setup;
using Microsoft.Extensions.Options;

namespace Datapoint.Apiary.Hosting;

public sealed partial class StartupTasks(
    IClusterState cluster,
    LocalOperatorToken operatorToken,
    SetupWindow setup,
    IOptions<ApiaryOptions> options,
    ILogger<StartupTasks> logger) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        await operatorToken.WriteAsync(cancellationToken);
        if (!setup.IsOpen(cluster.Current))
        {
            return;
        }

        LogSetupOpen(Environment.MachineName, options.Value.AdminPort, setup.ClosesAt);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    [LoggerMessage(Level = LogLevel.Warning, Message = "Waiting for setup at http://{Host}:{Port} until {ClosesAt:HH:mm} UTC. Whoever opens it first creates the first administrator.")]
    private partial void LogSetupOpen(string host, int port, DateTimeOffset closesAt);
}
