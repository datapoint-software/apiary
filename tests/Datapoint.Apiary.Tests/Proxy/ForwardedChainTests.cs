using System.Net;
using Datapoint.Apiary.Proxy.Forwarding;
using Microsoft.Extensions.Primitives;

namespace Datapoint.Apiary.Tests.Proxy;

public sealed class ForwardedChainTests
{
    private static readonly IPNetwork s_proxies = IPNetwork.Parse("10.20.30.0/24");

    [Fact]
    public void The_client_is_the_last_address_before_the_proxy()
    {
        var chain = Read("198.51.100.23, 203.0.113.9");

        Assert.Equal(IPAddress.Parse("203.0.113.9"), chain?.Client);
    }

    [Fact]
    public void Trusted_addresses_in_the_chain_are_skipped()
    {
        var chain = Read("203.0.113.9, 10.20.30.4");

        Assert.Equal(IPAddress.Parse("203.0.113.9"), chain?.Client);
    }

    [Fact]
    public void A_chain_of_trusted_addresses_ends_at_the_first_one()
    {
        var chain = Read("10.20.30.5, 10.20.30.4");

        Assert.Equal(IPAddress.Parse("10.20.30.5"), chain?.Client);
    }

    [Fact]
    public void Addresses_before_the_client_can_t_change_who_it_is()
    {
        var chain = Read("10.20.30.7, 198.51.100.1, 203.0.113.9");

        Assert.Equal(IPAddress.Parse("203.0.113.9"), chain?.Client);
    }

    [Theory]
    [InlineData("203.0.113.9:51234", "203.0.113.9")]
    [InlineData("[2001:db8::1]:51234", "2001:db8::1")]
    [InlineData("2001:db8::1", "2001:db8::1")]
    public void An_address_can_carry_a_port(string forwardedFor, string client) =>
        Assert.Equal(IPAddress.Parse(client), Read(forwardedFor)?.Client);

    [Fact]
    public void Several_headers_read_as_one_chain()
    {
        var chain = ForwardedChain.Read(new StringValues(["198.51.100.23", "203.0.113.9, 10.20.30.4"]), StringValues.Empty, Trusted);

        Assert.Equal(["198.51.100.23", "203.0.113.9", "10.20.30.4"], chain?.Addresses);
    }

    [Fact]
    public void Without_a_chain_there_is_no_client()
    {
        var chain = Read("");

        Assert.Null(chain?.Client);
    }

    [Theory]
    [InlineData("203.0.113.9, proxy.example.com")]
    [InlineData("unknown")]
    public void A_chain_with_something_that_isn_t_an_address_is_ignored(string forwardedFor) =>
        Assert.Null(Read(forwardedFor));

    [Fact]
    public void A_chain_longer_than_20_addresses_is_ignored() =>
        Assert.Null(Read(string.Join(", ", Enumerable.Repeat("203.0.113.9", 21))));

    [Theory]
    [InlineData("https", "https")]
    [InlineData("HTTPS", "https")]
    [InlineData("http", "http")]
    public void The_scheme_comes_from_X_Forwarded_Proto(string proto, string scheme) =>
        Assert.Equal(scheme, Read("203.0.113.9", proto)?.Scheme);

    [Theory]
    [InlineData("ws")]
    [InlineData("")]
    public void Anything_but_http_or_https_isn_t_a_scheme(string proto) =>
        Assert.Null(Read("203.0.113.9", proto)?.Scheme);

    [Fact]
    public void The_scheme_is_the_one_of_the_client_s_hop()
    {
        var chain = Read("203.0.113.9, 10.20.30.4", "https, http");

        Assert.Equal("https", chain?.Scheme);
    }

    [Fact]
    public void A_single_scheme_counts_for_every_hop()
    {
        var chain = Read("203.0.113.9, 10.20.30.4", "https");

        Assert.Equal("https", chain?.Scheme);
    }

    private static ForwardedChain? Read(string forwardedFor, string forwardedProto = "") =>
        ForwardedChain.Read(forwardedFor, forwardedProto, Trusted);

    private static bool Trusted(IPAddress address) => s_proxies.Contains(address);
}
