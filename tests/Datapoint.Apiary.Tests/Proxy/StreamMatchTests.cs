using Datapoint.Apiary.Cluster.Streams;
using Datapoint.Apiary.Proxy.Streams;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Tests.Proxy;

public sealed class StreamMatchTests
{
    private readonly StreamRoute _shop = AStream(listenPort: 443) with { ServerNames = ["shop.example.com"] };
    private readonly StreamRoute _wildcard = AStream(listenPort: 443) with { ServerNames = ["*.example.com"] };
    private readonly StreamRoute _fallback = AStream(listenPort: 443);

    [Fact]
    public void Routes_without_server_names_don_t_need_one()
    {
        Assert.False(StreamMatch.NeedsServerName([_fallback]));
    }

    [Fact]
    public void A_route_with_server_names_needs_one()
    {
        Assert.True(StreamMatch.NeedsServerName([_fallback, _shop]));
    }

    [Fact]
    public void An_exact_server_name_wins_over_a_wildcard()
    {
        Assert.Same(_shop, StreamMatch.Choose([_wildcard, _shop, _fallback], "shop.example.com"));
    }

    [Fact]
    public void A_wildcard_matches_one_label()
    {
        Assert.Same(_wildcard, StreamMatch.Choose([_shop, _wildcard, _fallback], "api.example.com"));
    }

    [Theory]
    [InlineData("a.api.example.com")]
    [InlineData("example.com")]
    [InlineData(".example.com")]
    [InlineData("api.example.org")]
    public void A_wildcard_doesn_t_match_other_depths_or_domains(string serverName)
    {
        Assert.Same(_fallback, StreamMatch.Choose([_wildcard, _fallback], serverName));
    }

    [Fact]
    public void Without_a_server_name_the_route_without_names_is_chosen()
    {
        Assert.Same(_fallback, StreamMatch.Choose([_shop, _fallback], null));
    }

    [Fact]
    public void An_unknown_server_name_without_a_fallback_chooses_nothing()
    {
        Assert.Null(StreamMatch.Choose([_shop, _wildcard], "other.example.org"));
    }

    [Fact]
    public void Routes_on_the_same_port_and_target_have_the_same_target()
    {
        Assert.True(StreamMatch.SameTarget(_shop, _shop with { Name = "Renamed", ServerNames = [] }));
    }

    [Theory]
    [InlineData(StreamProtocol.Udp, 443, "shop_db", 5432)]
    [InlineData(StreamProtocol.Tcp, 8443, "shop_db", 5432)]
    [InlineData(StreamProtocol.Tcp, 443, "other_db", 5432)]
    [InlineData(StreamProtocol.Tcp, 443, "shop_db", 5433)]
    public void A_different_protocol_port_or_target_is_a_different_target(StreamProtocol protocol, int listenPort, string targetHost, int targetPort)
    {
        var changed = _shop with { Protocol = protocol, ListenPort = listenPort, TargetHost = targetHost, TargetPort = targetPort };

        Assert.False(StreamMatch.SameTarget(_shop, changed));
    }
}
