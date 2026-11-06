using Datapoint.Apiary.Certificates.Dns;
using Datapoint.Apiary.Cluster.DnsProviders;
using Datapoint.Apiary.Cluster.State;
using Microsoft.Extensions.Logging;

namespace Datapoint.Apiary.Certificates.DnsProviders;

public sealed partial class DnsChallengeCleanup(IClusterState cluster, DnsChallengeWriter dns, ILogger<DnsChallengeCleanup> logger)
{
    public async Task<IReadOnlyList<string>> RemoveAsync(IEnumerable<DnsChallengeRecord> records, CancellationToken cancellationToken)
    {
        var removed = new List<string>();
        foreach (var record in records)
        {
            if (await TryRemoveAsync(record, cancellationToken))
            {
                removed.Add(DnsChallengeRecord.KeyOf(record.Name, record.Value));
            }
        }

        return removed;
    }

    private async Task<bool> TryRemoveAsync(DnsChallengeRecord record, CancellationToken cancellationToken)
    {
        if (!cluster.Current.DnsProviders.TryGetValue(record.ProviderId, out var provider))
        {
            return true;
        }

        try
        {
            await dns.RemoveAsync(provider, record.Zone, record.Name, record.Value, cancellationToken);
            return true;
        }
        catch (DnsException exception)
        {
            LogRemoveFailed(record.Name, exception.Code, exception.Detail);
            return false;
        }
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "Couldn't remove the TXT record at {Name}, so it's tried again later: {Code} {Detail}")]
    private partial void LogRemoveFailed(string name, string code, string? detail);
}
