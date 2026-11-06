using System.Text.Json.Nodes;
using Datapoint.Apiary.Certificates.DnsProviders;
using Datapoint.Apiary.Cluster.DnsProviders;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Certificates.Tests.DnsProviders;

public static class ProviderApis
{
    public const string Zone = "example.com";
    public const string Name = "_acme-challenge.shop.example.com";
    public const string Value = "gfj9Xq-Rr8AKmaChallengeValue";

    public static DnsProvider Provider(DnsProviderKind kind, IReadOnlyList<(string Key, string Value)> settings, IReadOnlyList<(string Key, string Value)> secrets) =>
        ADnsProvider(Zone, kind) with
        {
            Settings = settings.ToDictionary(s => s.Key, s => s.Value, StringComparer.Ordinal),
            Secrets = secrets.ToDictionary(s => s.Key, s => s.Value, StringComparer.Ordinal),
        };

    public static DnsProvider WithToken(DnsProviderKind kind) =>
        Provider(kind, [], [(DnsProviderFields.Token, "api-token")]);

    public static void AssertJson(string expected, string actual) =>
        Assert.True(JsonNode.DeepEquals(JsonNode.Parse(expected), JsonNode.Parse(actual)), actual);
}
