using Datapoint.Apiary.Certificates.Bundles;
using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Cluster.Raft;
using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Hosting;

public sealed partial class AdminCertificateKeeper(RaftClusterState cluster, TimeProvider time, ILogger<AdminCertificateKeeper> logger) : BackgroundService
{
    private static readonly TimeSpan s_interval = TimeSpan.FromMinutes(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await cluster.WaitUntilReadyAsync(stoppingToken);
        using var timer = new PeriodicTimer(s_interval, time);
        do
        {
            try
            {
                await EnsureAsync(stoppingToken);
            }
            catch (ClusterUnavailableException)
            {
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task EnsureAsync(CancellationToken cancellationToken)
    {
        if (!cluster.IsLeader || !Due(cluster.Current, time.GetUtcNow()))
        {
            return;
        }

        using var _ = await cluster.LockAsync(cancellationToken);
        var now = time.GetUtcNow();
        if (!Due(cluster.Current, now))
        {
            return;
        }

        var certificate = new AdminCertificate(SelfSignedCertificates.Create(now), SelfSigned: true, now, ChangedBy: null);
        await cluster.AppendAsync(new StateEntry(Guid.CreateVersion7(now), now, [new AdminCertificateSaved(certificate)]), cancellationToken);
        LogCreated(certificate.Fingerprint);
    }

    private static bool Due(ApiaryState state, DateTimeOffset now) =>
        state.AdminCertificate is not { } current || (current.SelfSigned && current.Material.NotAfter - now < SelfSignedCertificates.RenewBefore);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Created a self-signed certificate for the admin interface, with SHA-256 fingerprint {Fingerprint}. Browsers warn about it: check the fingerprint before accepting it, or upload a certificate your clients trust")]
    private partial void LogCreated(string fingerprint);
}
