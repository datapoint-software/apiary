using Datapoint.Apiary.Cluster.Streams;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Routes;
using Datapoint.Apiary.Management.Streams;
using Datapoint.Apiary.Testing;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Management.Tests.Streams;

public sealed class ListStreamRoutesTests : IDisposable
{
    private readonly ManagementHost _host = new();
    private readonly Guid _projectId;

    public ListStreamRoutesTests()
    {
        _host.SignedIn(Role.Viewer);
        _projectId = _host.AProjectIn().Id;
    }

    public void Dispose() => _host.Dispose();

    [Fact]
    public async Task Stream_routes_are_listed_by_port_then_protocol_then_name()
    {
        _host.Seed(
            new StreamRouteSaved(AStream(_projectId, listenPort: 6000) with { Name = "Cache" }),
            new StreamRouteSaved(AStream(_projectId, listenPort: 5432) with { Name = "replica", Protocol = StreamProtocol.Udp }),
            new StreamRouteSaved(AStream(_projectId, listenPort: 5432) with { Name = "Primary" }),
            new StreamRouteSaved(AStream(_projectId, listenPort: 5432) with { Name = "metrics" }));

        var streams = await _host.QueryAsync(new ListStreamRoutes());

        Assert.Equal(["metrics", "Primary", "replica", "Cache"], streams.Select(s => s.Name));
    }

    [Fact]
    public async Task Only_the_project_s_stream_routes_are_listed_when_one_is_asked_for()
    {
        _host.Seed(new StreamRouteSaved(AStream(_projectId) with { Name = "Database" }), new StreamRouteSaved(AStream() with { Name = "Elsewhere" }));

        var streams = await _host.QueryAsync(new ListStreamRoutes(_projectId));

        Assert.Equal("Database", Assert.Single(streams).Name);
    }

    [Fact]
    public async Task A_stream_route_shows_its_connections_across_replicas()
    {
        var stream = AStream(_projectId);
        _host.Seed(new StreamRouteSaved(stream));
        _host.Telemetry.Readings[stream.Id] = RouteTelemetry.Unknown with { Connections = 3, LastConnectionAt = TestClock.Now };

        var view = Assert.Single(await _host.QueryAsync(new ListStreamRoutes()));

        Assert.Equal((3L, TestClock.Now), (view.Connections, view.LastConnectionAt));
    }

    [Fact]
    public async Task A_stream_route_without_readings_has_no_connections()
    {
        _host.Seed(new StreamRouteSaved(AStream(_projectId)));

        var view = Assert.Single(await _host.QueryAsync(new ListStreamRoutes()));

        Assert.Equal((0L, null), (view.Connections, view.LastConnectionAt));
    }

    [Fact]
    public async Task A_stream_route_s_view_carries_its_settings()
    {
        var stream = AStream(_projectId, listenPort: 443) with
        {
            ServerNames = ["db.example.com"],
            Disabled = true,
            AllowedAddresses = ["10.0.0.0/8"],
        };
        _host.Seed(new StreamRouteSaved(stream));

        var view = Assert.Single(await _host.QueryAsync(new ListStreamRoutes()));

        Assert.Equal((stream.Id, _projectId, "Database", StreamProtocol.Tcp, 443), (view.Id, view.ProjectId, view.Name, view.Protocol, view.ListenPort));
        Assert.Equal(("shop_db", 5432, 300, true), (view.TargetHost, view.TargetPort, view.IdleTimeoutSeconds, view.Disabled));
        Assert.Equal(["db.example.com"], view.ServerNames);
        Assert.Equal(["10.0.0.0/8"], view.AllowedAddresses);
        Assert.Equal((stream.ChangedAt, "ana@example.com"), (view.ChangedAt, view.ChangedBy));
    }

    [Fact]
    public async Task A_stream_route_without_an_allowlist_allows_every_address()
    {
        _host.Seed(new StreamRouteSaved(AStream(_projectId)));

        var view = Assert.Single(await _host.QueryAsync(new ListStreamRoutes()));

        Assert.Empty(view.AllowedAddresses);
    }
}
