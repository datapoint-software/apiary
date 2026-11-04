using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Routes;
using Datapoint.Apiary.Testing;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Management.Tests.Routes;

public sealed class ReadRouteTests : IDisposable
{
    private readonly ManagementHost _host = new();
    private readonly Guid _projectId;

    public ReadRouteTests()
    {
        _host.SignedIn(Role.Viewer);
        _projectId = _host.AProjectIn().Id;
    }

    public void Dispose() => _host.Dispose();

    [Fact]
    public async Task Routes_are_listed_by_hostname_then_path()
    {
        _host.Seed(
            new RouteSaved(ARoute(_projectId, "shop.example.com", "/")),
            new RouteSaved(ARoute(_projectId, "api.example.com", "/v2")),
            new RouteSaved(ARoute(_projectId, "api.example.com", "/v1")));

        var routes = await _host.QueryAsync(new ListRoutes());

        Assert.Equal(["api.example.com/v1", "api.example.com/v2", "shop.example.com/"], routes.Select(r => r.Host + r.Path));
    }

    [Fact]
    public async Task Only_the_project_s_routes_are_listed_when_one_is_asked_for()
    {
        _host.Seed(new RouteSaved(ARoute(_projectId, "shop.example.com")), new RouteSaved(ARoute(host: "blog.example.com")));

        var routes = await _host.QueryAsync(new ListRoutes(_projectId));

        Assert.Equal("shop.example.com", Assert.Single(routes).Host);
    }

    [Fact]
    public async Task A_listed_route_shows_its_requests_and_health_across_replicas()
    {
        var route = ARoute(_projectId);
        _host.Seed(new RouteSaved(route));
        _host.Telemetry.Readings[route.Id] = new RouteTelemetry(42, RouteHealth.Degraded, 1);

        var view = Assert.Single(await _host.QueryAsync(new ListRoutes()));

        Assert.Equal((42L, RouteHealth.Degraded, 1), (view.RequestsPerMinute, view.Health, view.TargetsDown));
    }

    [Fact]
    public async Task A_route_without_readings_has_unknown_health()
    {
        _host.Seed(new RouteSaved(ARoute(_projectId)));

        var view = Assert.Single(await _host.QueryAsync(new ListRoutes()));

        Assert.Equal((0L, RouteHealth.Unknown, 0), (view.RequestsPerMinute, view.Health, view.TargetsDown));
    }

    [Fact]
    public async Task A_route_s_view_carries_its_settings()
    {
        var route = ARoute(_projectId) with
        {
            Disabled = true,
            AllowedAddresses = ["10.0.0.0/8"],
            RateLimit = 600,
            Sticky = true,
            Compression = true,
            Caching = true,
            StrictTransport = true,
            StrictTransportSubdomains = true,
            CachePurgedAt = TestClock.Now.AddHours(-1),
        };
        _host.Seed(new RouteSaved(route));

        var view = await _host.QueryAsync(new GetRoute(route.Id));

        Assert.Equal((route.Id, _projectId, "shop.example.com", "/", 30), (view.Id, view.ProjectId, view.Host, view.Path, view.TimeoutSeconds));
        Assert.Equal(route.Targets, view.Targets);
        Assert.Equal(["10.0.0.0/8"], view.AllowedAddresses);
        Assert.Equal((true, 600, true, true, true), (view.Disabled, view.RateLimit, view.Sticky, view.Compression, view.Caching));
        Assert.Equal((true, true, route.CachePurgedAt), (view.StrictTransport, view.StrictTransportSubdomains, view.CachePurgedAt));
        Assert.Equal((route.ChangedAt, "ana@example.com"), (view.ChangedAt, view.ChangedBy));
    }

    [Fact]
    public async Task A_route_without_an_allowlist_allows_every_address()
    {
        var route = ARoute(_projectId);
        _host.Seed(new RouteSaved(route));

        var view = await _host.QueryAsync(new GetRoute(route.Id));

        Assert.Empty(view.AllowedAddresses);
    }

    [Fact]
    public async Task A_route_s_password_is_shown_without_its_hash()
    {
        var route = ARoute(_projectId) with
        {
            Password = new RoutePassword("hash", "cookie-key", TestClock.Now, "ana@example.com", 30, "Ask Ana for the password"),
        };
        _host.Seed(new RouteSaved(route));

        var view = await _host.QueryAsync(new GetRoute(route.Id));

        Assert.Equal(new RoutePasswordView(TestClock.Now, "ana@example.com", 30, "Ask Ana for the password", null), view.Password);
    }

    [Fact]
    public async Task A_route_is_read_with_its_readings()
    {
        var route = ARoute(_projectId);
        _host.Seed(new RouteSaved(route));
        _host.Telemetry.Readings[route.Id] = new RouteTelemetry(7, RouteHealth.Down, 2);

        var view = await _host.QueryAsync(new GetRoute(route.Id));

        Assert.Equal((7L, RouteHealth.Down, 2), (view.RequestsPerMinute, view.Health, view.TargetsDown));
    }

    [Fact]
    public async Task An_unknown_route_is_not_found()
    {
        var failure = await Assert.ThrowsAsync<ActionFailedException>(() => _host.QueryAsync(new GetRoute(AnId())));

        Assert.Equal(ErrorCodes.RouteNotFound, failure.Code);
    }
}
