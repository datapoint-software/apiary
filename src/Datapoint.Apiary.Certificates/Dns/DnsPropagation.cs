using System.Net;

namespace Datapoint.Apiary.Certificates.Dns;

public sealed class DnsPropagation(DnsLookup lookup, TimeProvider time)
{
    public static readonly TimeSpan Timeout = TimeSpan.FromMinutes(2);
    public static readonly TimeSpan Interval = TimeSpan.FromSeconds(5);

    public async Task<TimeSpan> WaitAsync(string name, string value, CancellationToken cancellationToken)
    {
        var started = time.GetUtcNow();
        var servers = await lookup.NameServersAsync(await lookup.ZoneOfAsync(name, cancellationToken), cancellationToken);
        while (time.GetUtcNow() - started < Timeout)
        {
            if (await AllShowAsync(servers, name, value, cancellationToken))
            {
                return time.GetUtcNow() - started;
            }

            await Task.Delay(Interval, time, cancellationToken);
        }

        throw new DnsException(DnsErrors.NotPropagated, $"Not every name server showed the TXT record at {name} within {Timeout.TotalMinutes:0} minutes.");
    }

    private async Task<bool> AllShowAsync(IReadOnlyList<IPEndPoint> servers, string name, string value, CancellationToken cancellationToken)
    {
        foreach (var server in servers)
        {
            if (!await ShowsAsync(server, name, value, cancellationToken))
            {
                return false;
            }
        }

        return true;
    }

    private async Task<bool> ShowsAsync(IPEndPoint server, string name, string value, CancellationToken cancellationToken)
    {
        try
        {
            return (await lookup.TextAsync(server, name, cancellationToken)).Contains(value, StringComparer.Ordinal);
        }
        catch (DnsException)
        {
            return false;
        }
    }
}
