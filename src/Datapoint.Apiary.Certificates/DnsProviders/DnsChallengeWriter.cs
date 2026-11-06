using System.Security.Cryptography;
using Datapoint.Apiary.Certificates.Dns;
using Datapoint.Apiary.Cluster.DnsProviders;
using Datapoint.Apiary.Security.Tokens;

namespace Datapoint.Apiary.Certificates.DnsProviders;

public sealed class DnsChallengeWriter(IEnumerable<IDnsProviderClient> clients, DnsLookup lookup, DnsPropagation propagation, TimeProvider time)
{
    public static DnsChallengeTarget Target(DnsProvider provider, string host) => provider.ChallengeZone is { } zone
        ? new DnsChallengeTarget(DnsNames.Delegated(host, zone), zone, DnsNames.Challenge(host))
        : new DnsChallengeTarget(DnsNames.Challenge(host), ZoneFor(provider, host) ?? throw NotCovered(provider, host), null);

    public static string? ZoneFor(DnsProvider provider, string host) =>
        provider.Domains.Where(d => DnsNames.IsUnder(host, d)).MaxBy(d => d.Length);

    public static bool Covers(DnsProvider provider, string host) => ZoneFor(provider, host) is not null;

    public async Task CheckDelegationAsync(DnsChallengeTarget target, CancellationToken cancellationToken)
    {
        if (target.DelegatedFrom is not { } from)
        {
            return;
        }

        var name = await lookup.CanonicalNameAsync(from, cancellationToken);
        if (string.Equals(name, target.RecordName, StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        throw new DnsException(DnsErrors.CnameMissing, $"{from} must be a CNAME to {target.RecordName}.");
    }

    public Task AddAsync(DnsProvider provider, DnsChallengeTarget target, string value, CancellationToken cancellationToken) =>
        Client(provider).AddAsync(provider, target.Zone, target.RecordName, value, cancellationToken);

    public Task RemoveAsync(DnsProvider provider, string zone, string name, string value, CancellationToken cancellationToken) =>
        Client(provider).RemoveAsync(provider, zone, name, value, cancellationToken);

    public Task<TimeSpan> WaitAsync(DnsChallengeTarget target, string value, CancellationToken cancellationToken) =>
        propagation.WaitAsync(target.RecordName, value, cancellationToken);

    public async Task<DnsProviderTest> TestAsync(DnsProvider provider, CancellationToken cancellationToken)
    {
        var zone = provider.ChallengeZone ?? provider.Domains[0];
        var name = DnsNames.TestLabel + "." + zone;
        var value = Base64Url.Encode(RandomNumberGenerator.GetBytes(16));
        try
        {
            await Client(provider).AddAsync(provider, zone, name, value, cancellationToken);
            await Client(provider).RemoveAsync(provider, zone, name, value, cancellationToken);
            return new DnsProviderTest(time.GetUtcNow(), null, null);
        }
        catch (DnsException exception)
        {
            return new DnsProviderTest(time.GetUtcNow(), exception.Code, exception.Detail);
        }
    }

    private static DnsException NotCovered(DnsProvider provider, string host) =>
        new(DnsErrors.ZoneNotFound, $"{provider.Name} doesn't prove {host}.");

    private IDnsProviderClient Client(DnsProvider provider) =>
        clients.FirstOrDefault(c => c.Kind == provider.Kind)
        ?? throw new InvalidOperationException($"No client for {provider.Kind} DNS providers.");
}
