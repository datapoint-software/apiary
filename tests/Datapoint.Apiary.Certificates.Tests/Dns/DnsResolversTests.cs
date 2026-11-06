using System.Net;
using Datapoint.Apiary.Certificates.Dns;

namespace Datapoint.Apiary.Certificates.Tests.Dns;

public sealed class DnsResolversTests
{
    [Fact]
    public void Reads_the_name_servers_of_a_resolver_file()
    {
        const string File = "# Docker\nnameserver 127.0.0.11\noptions ndots:0\nnameserver 2001:db8::53\nsearch example.com\n";

        Assert.Equal(
            [new IPEndPoint(IPAddress.Parse("127.0.0.11"), 53), new IPEndPoint(IPAddress.Parse("2001:db8::53"), 53)],
            DnsResolvers.FromResolverFile(File));
    }

    [Fact]
    public void Reads_a_configured_list_with_ports()
    {
        Assert.Equal(
            [new IPEndPoint(IPAddress.Parse("10.0.0.53"), 53), new IPEndPoint(IPAddress.Parse("10.0.0.54"), 5353)],
            DnsResolvers.Parse("10.0.0.53, 10.0.0.54:5353, not-an-address"));
    }
}
