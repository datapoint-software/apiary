using Datapoint.Apiary.Certificates.DnsProviders;
using Datapoint.Apiary.Cluster.Acme;
using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Cluster.DnsProviders;
using Datapoint.Apiary.Cluster.State;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Datapoint.Apiary.Certificates.Renewal;

public sealed partial class CertificateRenewal(
    IClusterState cluster,
    CertificateIssuer issuer,
    DnsChallengeCleanup cleanup,
    TimeProvider time,
    ILogger<CertificateRenewal> logger) : BackgroundService
{
    public const string RenewAction = "certificates.renew";
    public const string IssueAction = "certificates.issue";
    private static readonly TimeSpan s_interval = TimeSpan.FromMinutes(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var changed = WaitForChange();
            try
            {
                await RunOnceAsync(stoppingToken);
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                LogRunFailed(exception);
            }

            await Task.WhenAny(changed, Task.Delay(s_interval, time, stoppingToken));
        }
    }

    private Task WaitForChange()
    {
        var changed = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        cluster.GetChangeToken().RegisterChangeCallback(_ => changed.TrySetResult(), null);
        return changed.Task;
    }

    private async Task RunOnceAsync(CancellationToken cancellationToken)
    {
        if (!cluster.IsLeader || !cluster.IsWritable)
        {
            return;
        }

        foreach (var host in RenewalPlan.Due(cluster.Current, time.GetUtcNow()))
        {
            var action = RenewalPlan.Automatic(cluster.Current, host)?.Material is null ? IssueAction : RenewAction;
            await issuer.IssueAsync(host, user: null, action, cancellationToken);
        }

        await MarkUnusedAsync(cancellationToken);
    }

    private async Task MarkUnusedAsync(CancellationToken cancellationToken)
    {
        var state = cluster.Current;
        var now = time.GetUtcNow();
        List<IStateChange> changes = [.. UnusedChanges(state, now), .. await ExpiredChallengeChangesAsync(state, now, cancellationToken)];
        if (changes.Count == 0)
        {
            return;
        }

        await cluster.AppendAsync(new StateEntry(Guid.CreateVersion7(now), now, changes), cancellationToken);
    }

    private static List<IStateChange> UnusedChanges(ApiaryState state, DateTimeOffset now)
    {
        var wanted = RenewalPlan.WantedHosts(state);
        var changes = new List<IStateChange>();
        foreach (var certificate in state.Certificates.Values.Where(c => c.Source == CertificateSource.Automatic))
        {
            var isWanted = certificate.Requested || wanted.Contains(certificate.Name);
            if (isWanted && certificate.UnusedSince is not null)
            {
                changes.Add(new CertificateSaved(certificate with { UnusedSince = null }));
            }
            else if (!isWanted && certificate.UnusedSince is null)
            {
                changes.Add(new CertificateSaved(certificate with { UnusedSince = now }));
            }
            else if (!isWanted && certificate.UnusedSince + RenewalPlan.KeepUnused < now)
            {
                changes.Add(new CertificateDeleted(certificate.Id));
            }
        }

        return changes;
    }

    private async Task<List<IStateChange>> ExpiredChallengeChangesAsync(ApiaryState state, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var changes = new List<IStateChange>();
        var expired = state.AcmeChallenges.Values.Where(c => c.ExpiresAt < now).Select(c => c.Token).ToList();
        if (expired.Count > 0)
        {
            changes.Add(new AcmeChallengesRemoved(expired));
        }

        var leftRecords = await cleanup.RemoveAsync(state.DnsChallengeRecords.Values.Where(r => r.ExpiresAt < now), cancellationToken);
        if (leftRecords.Count > 0)
        {
            changes.Add(new DnsChallengeRecordsRemoved(leftRecords));
        }

        return changes;
    }

    [LoggerMessage(Level = LogLevel.Error, Message = "The certificate renewal check failed")]
    private partial void LogRunFailed(Exception exception);
}
