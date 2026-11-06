using System.Net;
using Microsoft.Extensions.Options;

namespace Datapoint.Apiary.Certificates.Dns;

public sealed class DnsLookup(DnsClient client, IOptions<DnsOptions> options)
{
    public int ServerPort => options.Value.ServerPort;

    public async Task<string> ZoneOfAsync(string name, CancellationToken cancellationToken)
    {
        var response = await ResolveAsync(name, DnsRecordType.Soa, cancellationToken);
        var soa = response.Answers.Concat(response.Authorities).FirstOrDefault(r => r.Type == DnsRecordType.Soa);
        return soa?.Name ?? throw new DnsException(DnsErrors.ZoneNotFound, $"No DNS zone holds {name}.");
    }

    public async Task<IReadOnlyList<IPEndPoint>> NameServersAsync(string zone, CancellationToken cancellationToken)
    {
        var response = await ResolveAsync(zone, DnsRecordType.NS, cancellationToken);
        var servers = new List<IPEndPoint>();
        foreach (var host in response.Answers.Where(r => r.Type == DnsRecordType.NS).Select(r => r.Data).Distinct(StringComparer.Ordinal))
        {
            servers.AddRange(await AddressesAsync(host, cancellationToken));
        }

        return servers.Count > 0 ? servers : throw new DnsException(DnsErrors.ZoneNotFound, $"The zone {zone} has no name servers.");
    }

    public async Task<IReadOnlyList<IPEndPoint>> AddressesAsync(string host, CancellationToken cancellationToken)
    {
        if (IPAddress.TryParse(host, out var literal))
        {
            return [new IPEndPoint(literal, ServerPort)];
        }

        var addresses = Addresses(await ResolveAsync(host, DnsRecordType.A, cancellationToken), host);
        if (addresses.Count == 0)
        {
            addresses = Addresses(await ResolveAsync(host, DnsRecordType.Aaaa, cancellationToken), host);
        }

        return [.. addresses.Select(a => new IPEndPoint(a, ServerPort))];
    }

    public async Task<string?> CanonicalNameAsync(string name, CancellationToken cancellationToken)
    {
        var response = await ResolveAsync(name, DnsRecordType.CName, cancellationToken);
        return response.Answers.FirstOrDefault(r => r.Type == DnsRecordType.CName && r.Name == DnsNames.Normalize(name))?.Data;
    }

    public async Task<IReadOnlyList<string>> TextAsync(IPEndPoint server, string name, CancellationToken cancellationToken)
    {
        var response = await client.QueryAsync(server, name, DnsRecordType.Txt, recursionDesired: false, cancellationToken);
        return [.. response.Answers.Where(r => r.Type == DnsRecordType.Txt && r.Name == DnsNames.Normalize(name)).Select(r => r.Data)];
    }

    private async Task<DnsResponse> ResolveAsync(string name, DnsRecordType type, CancellationToken cancellationToken)
    {
        DnsException? failure = null;
        foreach (var resolver in Resolvers())
        {
            try
            {
                return await client.QueryAsync(resolver, name, type, recursionDesired: true, cancellationToken);
            }
            catch (DnsException exception)
            {
                failure = exception;
            }
        }

        throw failure ?? new DnsException(DnsErrors.Unreachable, "No DNS resolver is configured.");
    }

    private IReadOnlyList<IPEndPoint> Resolvers()
    {
        if (options.Value.Resolvers is { Length: > 0 } configured)
        {
            return DnsResolvers.Parse(configured);
        }

        return File.Exists(DnsOptions.ResolverFile) ? DnsResolvers.FromResolverFile(File.ReadAllText(DnsOptions.ResolverFile)) : [];
    }

    private static List<IPAddress> Addresses(DnsResponse response, string host) =>
        [.. response.Answers
            .Where(r => r.Type is DnsRecordType.A or DnsRecordType.Aaaa && r.Name == DnsNames.Normalize(host))
            .Select(r => IPAddress.Parse(r.Data))];
}
