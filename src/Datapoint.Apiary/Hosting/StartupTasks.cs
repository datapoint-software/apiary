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
    TimeProvider time,
    ILogger<StartupTasks> logger) : BackgroundService
{
    private static readonly TimeSpan s_certificatePoll = TimeSpan.FromSeconds(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await operatorToken.WriteAsync(stoppingToken);
        await cluster.WaitUntilReadyAsync(stoppingToken);
        while (cluster.Current.AdminCertificate is null)
        {
            await Task.Delay(s_certificatePoll, time, stoppingToken);
        }

        var fingerprint = cluster.Current.AdminCertificate.Fingerprint;
        if (!setup.IsOpen(cluster.Current))
        {
            LogAdminInterface(Environment.MachineName, options.Value.AdminPort, fingerprint);
            return;
        }

        LogSetupOpen(Environment.MachineName, options.Value.AdminPort, setup.ClosesAt, fingerprint);
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "The admin interface is at https://{Host}:{Port}, with certificate SHA-256 fingerprint {Fingerprint}")]
    private partial void LogAdminInterface(string host, int port, string fingerprint);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Waiting for setup at https://{Host}:{Port} until {ClosesAt:HH:mm} UTC. Whoever opens it first creates the first administrator. Check that your browser shows certificate SHA-256 fingerprint {Fingerprint} before you accept it.")]
    private partial void LogSetupOpen(string host, int port, DateTimeOffset closesAt, string fingerprint);
}
