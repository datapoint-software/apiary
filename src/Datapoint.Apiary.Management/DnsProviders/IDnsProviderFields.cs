using Datapoint.Apiary.Cluster.DnsProviders;

namespace Datapoint.Apiary.Management.DnsProviders;

public interface IDnsProviderFields
{
    string Name { get; }

    DnsProviderKind Kind { get; }

    IReadOnlyList<string> Domains { get; }

    string? ChallengeZone { get; }

    string? Server { get; }

    int? Port { get; }

    string? KeyName { get; }

    string? Algorithm { get; }

    string? Secret { get; }

    string? Token { get; }

    string? Tenant { get; }

    string? ClientId { get; }

    string? ClientSecret { get; }

    string? Subscription { get; }

    string? ResourceGroup { get; }

    string? AccessKey { get; }

    string? SecretKey { get; }
}
