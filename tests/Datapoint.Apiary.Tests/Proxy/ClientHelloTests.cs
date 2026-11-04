using Datapoint.Apiary.Proxy.Streams;
using Datapoint.Apiary.Tests.Hosting;
using static Datapoint.Apiary.Testing.Builders.ClientHelloBuilder;

namespace Datapoint.Apiary.Tests.Proxy;

public sealed class ClientHelloTests
{
    [Fact]
    public async Task A_real_client_hello_s_header_gives_the_record_s_length()
    {
        var record = await TlsClientHello.CaptureAsync("shop.example.com");

        Assert.Equal(record.Length - ClientHello.HeaderSize, ClientHello.RecordLength(record));
    }

    [Fact]
    public async Task A_real_client_hello_carries_the_server_name()
    {
        var record = await TlsClientHello.CaptureAsync("shop.example.com");

        Assert.Equal("shop.example.com", ClientHello.ServerName(record.AsSpan(ClientHello.HeaderSize)));
    }

    [Fact]
    public async Task A_real_client_hello_to_an_address_has_no_server_name()
    {
        var record = await TlsClientHello.CaptureAsync("192.0.2.10");

        Assert.Null(ClientHello.ServerName(record.AsSpan(ClientHello.HeaderSize)));
    }

    [Fact]
    public void A_header_shorter_than_five_bytes_has_no_length()
    {
        byte[] header = [22, 3, 1, 0];

        Assert.Null(ClientHello.RecordLength(header));
    }

    [Theory]
    [InlineData(23, 3, 0, 10)]
    [InlineData(22, 2, 0, 10)]
    [InlineData(22, 3, 0, 0)]
    [InlineData(22, 3, 0x40, 0x01)]
    public void A_header_that_isn_t_a_tls_handshake_of_a_sensible_length_has_no_length(byte contentType, byte majorVersion, byte lengthHigh, byte lengthLow)
    {
        byte[] header = [contentType, majorVersion, 1, lengthHigh, lengthLow];

        Assert.Null(ClientHello.RecordLength(header));
    }

    [Fact]
    public void The_largest_tls_record_is_accepted()
    {
        byte[] header = [22, 3, 1, 0x40, 0x00];

        Assert.Equal(ClientHello.MaximumRecord, ClientHello.RecordLength(header));
    }

    [Fact]
    public void Server_names_are_lowercased()
    {
        var hello = AClientHello().WithServerName("Shop.Example.COM").Message();

        Assert.Equal("shop.example.com", ClientHello.ServerName(hello));
    }

    [Fact]
    public void Extensions_before_the_server_name_are_skipped()
    {
        var hello = AClientHello().WithExtension(43, [2, 3, 4]).WithServerName("shop.example.com").Message();

        Assert.Equal("shop.example.com", ClientHello.ServerName(hello));
    }

    [Fact]
    public void Entries_that_aren_t_host_names_are_skipped()
    {
        var hello = AClientHello().WithServerNameEntries(ServerNameEntry("other", kind: 1), ServerNameEntry("shop.example.com")).Message();

        Assert.Equal("shop.example.com", ClientHello.ServerName(hello));
    }

    [Fact]
    public void An_empty_host_name_is_ignored()
    {
        var hello = AClientHello().WithServerName("").Message();

        Assert.Null(ClientHello.ServerName(hello));
    }

    [Fact]
    public void A_host_name_longer_than_253_characters_is_ignored()
    {
        var hello = AClientHello().WithServerName(new string('a', 254)).Message();

        Assert.Null(ClientHello.ServerName(hello));
    }

    [Fact]
    public void A_handshake_that_isn_t_a_client_hello_has_no_server_name()
    {
        var hello = (AClientHello() with { MessageType = 2 }).WithServerName("shop.example.com").Message();

        Assert.Null(ClientHello.ServerName(hello));
    }

    [Fact]
    public void A_client_hello_without_the_server_name_extension_has_none()
    {
        var hello = AClientHello().WithExtension(43, [2, 3, 4]).Message();

        Assert.Null(ClientHello.ServerName(hello));
    }

    [Fact]
    public void A_truncated_client_hello_has_no_server_name()
    {
        var hello = AClientHello().WithServerName("shop.example.com").Message();

        Assert.Null(ClientHello.ServerName(hello.AsSpan(..^4)));
    }

    [Fact]
    public void A_client_hello_cut_off_inside_a_length_has_no_server_name()
    {
        var hello = AClientHello().WithServerName("shop.example.com").Message();

        Assert.Null(ClientHello.ServerName(hello.AsSpan(..40)));
    }

    [Fact]
    public void An_extension_longer_than_the_extensions_is_ignored()
    {
        var hello = (AClientHello() with { Extensions = [[0, 43, 0, 50, 1, 2]] }).Message();

        Assert.Null(ClientHello.ServerName(hello));
    }

    [Fact]
    public void A_server_name_list_longer_than_its_extension_is_ignored()
    {
        var hello = AClientHello().WithExtension(0, [0, 50, 0, 0, 1, (byte)'a']).Message();

        Assert.Null(ClientHello.ServerName(hello));
    }

    [Fact]
    public void Trailing_bytes_too_short_for_an_extension_are_ignored()
    {
        var hello = (AClientHello() with { Extensions = [[0, 0]] }).Message();

        Assert.Null(ClientHello.ServerName(hello));
    }

    [Fact]
    public void An_empty_record_has_no_server_name()
    {
        Assert.Null(ClientHello.ServerName([]));
    }
}
