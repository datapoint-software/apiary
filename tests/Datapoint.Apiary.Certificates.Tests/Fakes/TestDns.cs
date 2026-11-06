using Datapoint.Apiary.Certificates.Dns;
using Datapoint.Apiary.Certificates.DnsProviders;
using Datapoint.Apiary.Certificates.Tests.Dns;
using Datapoint.Apiary.Cluster.State;
using Microsoft.Extensions.Logging.Abstractions;

namespace Datapoint.Apiary.Certificates.Tests.Fakes;

public sealed class TestDns(FakeDnsServer server, IClusterState cluster, TimeProvider time)
{
    public DnsChallengeWriter Writer { get; } = NewWriter(server, time);

    public DnsChallengeCleanup Cleanup => new(cluster, Writer, NullLogger<DnsChallengeCleanup>.Instance);

    private static DnsChallengeWriter NewWriter(FakeDnsServer server, TimeProvider time)
    {
        var lookup = DnsLookupTests.Lookup(server);
        var client = new Rfc2136DnsProvider(new DnsClient(TimeProvider.System), lookup, TimeProvider.System);
        return new DnsChallengeWriter([client], lookup, new DnsPropagation(lookup, time), time);
    }
}
