using System.Globalization;
using Datapoint.Apiary.Certificates.Dns;
using Datapoint.Apiary.Certificates.DnsProviders;
using Datapoint.Apiary.Cluster.DnsProviders;

namespace Datapoint.Apiary.Management.DnsProviders;

public static class DnsProviderInput
{
    public static DnsProvider Build(IDnsProviderFields fields, Guid id, DnsProvider? existing, DateTimeOffset now, string? user)
    {
        var settings = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var name in DnsProviderFields.RequiredSettings(fields.Kind).Concat(DnsProviderFields.OptionalSettings(fields.Kind)))
        {
            if (Value(fields, name) is { Length: > 0 } value)
            {
                settings[name] = value;
            }
        }

        var secrets = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var name in DnsProviderFields.Secrets(fields.Kind))
        {
            if ((Value(fields, name) ?? Kept(existing, fields.Kind, name)) is { Length: > 0 } value)
            {
                secrets[name] = value;
            }
        }

        return new DnsProvider(id, fields.Name.Trim(), fields.Kind, Domains(fields.Domains), Zone(fields.ChallengeZone), settings, secrets, null, now, user);
    }

    public static IReadOnlyList<string> Domains(IEnumerable<string> domains) =>
        [.. domains.Select(DnsNames.Normalize).Where(d => d.Length > 0).Distinct(StringComparer.Ordinal)];

    public static string? Zone(string? zone) => string.IsNullOrWhiteSpace(zone) ? null : DnsNames.Normalize(zone);

    public static string? Value(IDnsProviderFields fields, string name) => (name switch
    {
        DnsProviderFields.Server => fields.Server,
        DnsProviderFields.Port => fields.Port?.ToString(CultureInfo.InvariantCulture),
        DnsProviderFields.KeyName => fields.KeyName,
        DnsProviderFields.Algorithm => fields.Algorithm,
        DnsProviderFields.Secret => fields.Secret,
        DnsProviderFields.Token => fields.Token,
        DnsProviderFields.Tenant => fields.Tenant,
        DnsProviderFields.ClientId => fields.ClientId,
        DnsProviderFields.ClientSecret => fields.ClientSecret,
        DnsProviderFields.Subscription => fields.Subscription,
        DnsProviderFields.ResourceGroup => fields.ResourceGroup,
        DnsProviderFields.AccessKey => fields.AccessKey,
        DnsProviderFields.SecretKey => fields.SecretKey,
        _ => null,
    })?.Trim() is { Length: > 0 } trimmed ? trimmed : null;

    public static bool Keeps(DnsProvider? existing, DnsProviderKind kind, string name) => Kept(existing, kind, name) is not null;

    private static string? Kept(DnsProvider? existing, DnsProviderKind kind, string name) =>
        existing is not null && existing.Kind == kind ? existing.Secrets.GetValueOrDefault(name) : null;
}
