using Datapoint.Apiary.Cluster.Streams;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Streams;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Management.Tests.Streams;

public sealed class StreamRouteTests : IDisposable
{
    private readonly ManagementHost _host = new();
    private readonly Guid _projectId;

    public StreamRouteTests()
    {
        _host.SignedIn(Role.Operator);
        _projectId = _host.AProjectIn().Id;
    }

    public void Dispose() => _host.Dispose();

    [Fact]
    public async Task An_operator_creates_a_tcp_stream_route()
    {
        var id = await _host.SendAsync(ATcpStream() with { Name = " Database ", TargetHost = "Shop_DB", ServerNames = [" DB.Example.com ", "db.example.com"] });

        var stream = _host.State.StreamRoutes[id];
        Assert.Equal(("Database", "shop_db", "db.example.com"), (stream.Name, stream.TargetHost, stream.ServerNames.Single()));
    }

    [Fact]
    public async Task A_tcp_stream_ignores_the_idle_timeout()
    {
        var id = await _host.SendAsync(ATcpStream() with { IdleTimeoutSeconds = 900 });

        Assert.Equal(StreamRules.DefaultIdleTimeoutSeconds, _host.State.StreamRoutes[id].IdleTimeoutSeconds);
    }

    [Fact]
    public async Task A_udp_stream_keeps_its_idle_timeout()
    {
        var id = await _host.SendAsync(ATcpStream() with { Protocol = StreamProtocol.Udp, IdleTimeoutSeconds = 900 });

        Assert.Equal(900, _host.State.StreamRoutes[id].IdleTimeoutSeconds);
    }

    [Fact]
    public async Task A_udp_stream_can_t_have_server_names() =>
        Assert.Contains("ServerNames: stream.serverNamesUdp", await _host.ErrorsAsync(ATcpStream() with { Protocol = StreamProtocol.Udp, ServerNames = ["db.example.com"] }));

    [Theory]
    [InlineData(0)]
    [InlineData(3601)]
    public async Task A_udp_idle_timeout_out_of_range_is_refused(int seconds) =>
        Assert.Contains("IdleTimeoutSeconds: range", await _host.ErrorsAsync(ATcpStream() with { Protocol = StreamProtocol.Udp, IdleTimeoutSeconds = seconds }));

    [Fact]
    public async Task A_stream_has_at_most_20_server_names() =>
        Assert.Contains("ServerNames: stream.serverNamesTooMany", await _host.ErrorsAsync(ATcpStream() with { ServerNames = [.. Enumerable.Range(1, 21).Select(i => $"db{i}.example.com")] }));

    [Theory]
    [InlineData("db.example.com")]
    [InlineData("*.example.com")]
    public async Task A_server_name_is_a_hostname_or_a_wildcard(string name) =>
        Assert.Empty(await _host.ErrorsAsync(ATcpStream() with { ServerNames = [name] }));

    [Fact]
    public async Task A_server_name_that_isn_t_a_hostname_is_refused() =>
        Assert.Contains("ServerNames[0]: hostname.invalid", await _host.ErrorsAsync(ATcpStream() with { ServerNames = ["db"] }));

    [Fact]
    public async Task A_port_apiary_uses_itself_is_reserved()
    {
        using var host = new ManagementHost(new HashSet<int> { 443 });
        host.SignedIn(Role.Operator);
        var project = host.AProjectIn();

        Assert.Contains("ListenPort: stream.portReserved", await host.ErrorsAsync(new CreateStreamRoute(project.Id, "Web", StreamProtocol.Tcp, 443, "shop_web", 443)));
    }

    [Fact]
    public async Task Two_tcp_streams_without_server_names_can_t_share_a_port()
    {
        _host.Seed(new StreamRouteSaved(AStream(_projectId, 5432)));

        Assert.Contains("ListenPort: stream.portTaken", await _host.ErrorsAsync(ATcpStream()));
    }

    [Fact]
    public async Task Tcp_streams_with_different_server_names_share_a_port()
    {
        _host.Seed(new StreamRouteSaved(AStream(_projectId, 5432) with { ServerNames = ["a.example.com"] }));

        Assert.Empty(await _host.ErrorsAsync(ATcpStream() with { ServerNames = ["b.example.com"] }));
    }

    [Fact]
    public async Task Tcp_streams_with_a_server_name_in_common_can_t_share_a_port()
    {
        _host.Seed(new StreamRouteSaved(AStream(_projectId, 5432) with { ServerNames = ["a.example.com"] }));

        Assert.Contains("ListenPort: stream.portTaken", await _host.ErrorsAsync(ATcpStream() with { ServerNames = ["A.example.com", "b.example.com"] }));
    }

    [Fact]
    public async Task A_tcp_and_a_udp_stream_share_a_port()
    {
        _host.Seed(new StreamRouteSaved(AStream(_projectId, 5432)));

        Assert.Empty(await _host.ErrorsAsync(ATcpStream() with { Protocol = StreamProtocol.Udp }));
    }

    [Fact]
    public async Task A_stream_s_target_follows_the_target_rules() =>
        Assert.Contains("TargetHost: target.loopback", await _host.ErrorsAsync(ATcpStream() with { TargetHost = "127.0.0.1" }));

    [Fact]
    public async Task A_stream_keeps_its_own_port_when_updated()
    {
        var id = await _host.SendAsync(ATcpStream());

        Assert.Empty(await _host.ErrorsAsync(new UpdateStreamRoute(id, _projectId, "Database", StreamProtocol.Tcp, 5432, "shop_db", 5432)));
    }

    [Fact]
    public async Task Disabling_a_stream_keeps_its_settings()
    {
        var id = await _host.SendAsync(ATcpStream());

        await _host.SendAsync(new DisableStreamRoute(id));

        Assert.Equal((true, 5432), (_host.State.StreamRoutes[id].Disabled, _host.State.StreamRoutes[id].ListenPort));
    }

    [Fact]
    public async Task Enabling_a_stream_turns_it_back_on()
    {
        var id = await _host.SendAsync(ATcpStream());
        await _host.SendAsync(new DisableStreamRoute(id));

        await _host.SendAsync(new EnableStreamRoute(id));

        Assert.False(_host.State.StreamRoutes[id].Disabled);
    }

    [Fact]
    public async Task Deleting_a_stream_removes_it()
    {
        var id = await _host.SendAsync(ATcpStream());

        await _host.SendAsync(new DeleteStreamRoute(id));

        Assert.Empty(_host.State.StreamRoutes);
    }

    [Fact]
    public async Task Deleting_an_unknown_stream_fails() =>
        Assert.Equal(ErrorCodes.StreamNotFound, await _host.FailureAsync(new DeleteStreamRoute(AnId())));

    private CreateStreamRoute ATcpStream() => new(_projectId, "Database", StreamProtocol.Tcp, 5432, "shop_db", 5432);
}
