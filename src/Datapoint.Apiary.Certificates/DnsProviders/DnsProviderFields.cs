using Datapoint.Apiary.Cluster.DnsProviders;

namespace Datapoint.Apiary.Certificates.DnsProviders;

public static class DnsProviderFields
{
    public const string Server = "server";
    public const string Port = "port";
    public const string KeyName = "keyName";
    public const string Algorithm = "algorithm";
    public const string Secret = "secret";
    public const string Token = "token";
    public const string Tenant = "tenant";
    public const string ClientId = "clientId";
    public const string ClientSecret = "clientSecret";
    public const string Subscription = "subscription";
    public const string ResourceGroup = "resourceGroup";
    public const string AccessKey = "accessKey";
    public const string SecretKey = "secretKey";

    public static IReadOnlyList<string> RequiredSettings(DnsProviderKind kind) => kind switch
    {
        DnsProviderKind.Rfc2136 => [Server, KeyName, Algorithm],
        DnsProviderKind.Azure => [Tenant, ClientId, Subscription, ResourceGroup],
        DnsProviderKind.Route53 => [AccessKey],
        _ => [],
    };

    public static IReadOnlyList<string> OptionalSettings(DnsProviderKind kind) => kind == DnsProviderKind.Rfc2136 ? [Port] : [];

    public static IReadOnlyList<string> Secrets(DnsProviderKind kind) => kind switch
    {
        DnsProviderKind.Rfc2136 => [Secret],
        DnsProviderKind.Azure => [ClientSecret],
        DnsProviderKind.Route53 => [SecretKey],
        _ => [Token],
    };
}
