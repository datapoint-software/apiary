using System.Net;
using Datapoint.Apiary.Security.Network;

namespace Datapoint.Apiary.Security.Tests.Network;

public sealed class AddressPolicyTests
{
    [Theory]
    [InlineData("127.0.0.1")]
    [InlineData("127.1.2.3")]
    [InlineData("::1")]
    [InlineData("::ffff:127.0.0.1")]
    [InlineData("64:ff9b::7f00:1")]
    public void Loopback_addresses_are_loopback(string address) =>
        Assert.Equal(AddressKind.Loopback, AddressPolicy.Classify(IPAddress.Parse(address)));

    [Theory]
    [InlineData("169.254.169.254")]
    [InlineData("169.254.0.1")]
    [InlineData("fe80::1")]
    [InlineData("100.100.100.200")]
    [InlineData("fd00:ec2::254")]
    [InlineData("::ffff:169.254.169.254")]
    public void Link_local_and_cloud_metadata_addresses_are_link_local(string address) =>
        Assert.Equal(AddressKind.LinkLocal, AddressPolicy.Classify(IPAddress.Parse(address)));

    [Theory]
    [InlineData("0.0.0.0")]
    [InlineData("::")]
    public void Unspecified_addresses_are_unspecified(string address) =>
        Assert.Equal(AddressKind.Unspecified, AddressPolicy.Classify(IPAddress.Parse(address)));

    [Theory]
    [InlineData("10.0.1.5")]
    [InlineData("192.168.1.1")]
    [InlineData("8.8.8.8")]
    [InlineData("2001:db8::1")]
    [InlineData("100.100.100.201")]
    public void Other_addresses_are_routable(string address) =>
        Assert.Equal(AddressKind.Routable, AddressPolicy.Classify(IPAddress.Parse(address)));

    [Theory]
    [InlineData("localhost")]
    [InlineData("LOCALHOST")]
    [InlineData("app.localhost")]
    public void Localhost_names_are_loopback_names(string host) =>
        Assert.True(AddressPolicy.IsLoopbackName(host));

    [Theory]
    [InlineData("localhost.example.com")]
    [InlineData("mylocalhost")]
    [InlineData("web")]
    public void Other_names_aren_t_loopback_names(string host) =>
        Assert.False(AddressPolicy.IsLoopbackName(host));
}
