using System.Globalization;
using System.Net;
using Datapoint.Apiary.Certificates.Dns;
using Datapoint.Apiary.Cluster.DnsProviders;

namespace Datapoint.Apiary.Certificates.DnsProviders;

public sealed class Rfc2136DnsProvider(DnsClient client, DnsLookup lookup, TimeProvider time) : IDnsProviderClient
{
    public DnsProviderKind Kind => DnsProviderKind.Rfc2136;

    public Task AddAsync(DnsProvider provider, string zone, string name, string value, CancellationToken cancellationToken) =>
        UpdateAsync(provider, zone, name, value, DnsUpdateKind.Add, cancellationToken);

    public Task RemoveAsync(DnsProvider provider, string zone, string name, string value, CancellationToken cancellationToken) =>
        UpdateAsync(provider, zone, name, value, DnsUpdateKind.Remove, cancellationToken);

    private async Task UpdateAsync(DnsProvider provider, string zone, string name, string value, DnsUpdateKind kind, CancellationToken cancellationToken)
    {
        var server = await ServerAsync(provider, cancellationToken);
        var key = new DnsTsigKey(
            provider.Settings[DnsProviderFields.KeyName],
            provider.Settings[DnsProviderFields.Algorithm],
            Convert.FromBase64String(provider.Secrets[DnsProviderFields.Secret]));
        var message = DnsTsig.Sign(DnsMessages.Update(DnsClient.NewId(), zone, name, value, kind), key, time.GetUtcNow());
        Check(await client.ExchangeTcpAsync(server, message, cancellationToken), zone);
    }

    private async Task<IPEndPoint> ServerAsync(DnsProvider provider, CancellationToken cancellationToken)
    {
        var host = provider.Settings[DnsProviderFields.Server];
        var addresses = await lookup.AddressesAsync(host, cancellationToken);
        if (addresses.Count == 0)
        {
            throw new DnsException(DnsErrors.Unreachable, $"{host} has no address.");
        }

        return new IPEndPoint(addresses[0].Address, Port(provider));
    }

    private static int Port(DnsProvider provider) =>
        provider.Settings.TryGetValue(DnsProviderFields.Port, out var text) && int.TryParse(text, CultureInfo.InvariantCulture, out var port)
            ? port
            : Dns.DnsOptions.DefaultPort;

    private static void Check(DnsResponse response, string zone)
    {
        var isRefused = response.TsigError is DnsTsig.BadSignature or DnsTsig.BadKey or DnsTsig.BadTime
            || response.Code is DnsResponseCode.NotAuthorized or DnsResponseCode.Refused;
        if (isRefused)
        {
            throw new DnsException(DnsErrors.Unauthorized, $"The DNS server refused the update ({response.Code}, TSIG error {response.TsigError}).");
        }

        if (response.Code == DnsResponseCode.NotZone)
        {
            throw new DnsException(DnsErrors.ZoneNotFound, $"The DNS server doesn't hold the zone {zone}.");
        }

        if (response.Code == DnsResponseCode.NoError)
        {
            return;
        }

        throw new DnsException(DnsErrors.Unreachable, $"The DNS server couldn't apply the update ({response.Code}).");
    }
}
