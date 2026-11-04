using Datapoint.Apiary.Cluster.Redirects;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Cluster.Streams;
using Datapoint.Apiary.Testing;
using Datapoint.Apiary.Testing.Builders;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Cluster.Tests.Routes;

public sealed class RouteChangesTests
{
    [Fact]
    public void Saving_a_route_adds_it()
    {
        var route = ARoute();

        var state = ApiaryState.Empty.With(new RouteSaved(route));

        Assert.Same(route, state.Routes[route.Id]);
    }

    [Fact]
    public void Saving_a_route_again_replaces_it()
    {
        var route = ARoute();

        var state = ApiaryState.Empty.With(new RouteSaved(route), new RouteSaved(route with { Disabled = true }));

        Assert.True(state.Routes[route.Id].Disabled);
    }

    [Fact]
    public void Deleting_a_route_removes_only_that_route()
    {
        var kept = ARoute(host: "kept.example.com");
        var deleted = ARoute();

        var state = ApiaryState.Empty.With(new RouteSaved(kept), new RouteSaved(deleted), new RouteDeleted(deleted.Id));

        Assert.Equal([kept.Id], state.Routes.Keys);
    }

    [Fact]
    public void Saving_a_redirect_adds_it()
    {
        var redirect = ARedirect();

        var state = ApiaryState.Empty.With(new RedirectSaved(redirect));

        Assert.Same(redirect, state.Redirects[redirect.Id]);
    }

    [Fact]
    public void Deleting_a_redirect_removes_it()
    {
        var redirect = ARedirect();

        var state = ApiaryState.Empty.With(new RedirectSaved(redirect), new RedirectDeleted(redirect.Id));

        Assert.Empty(state.Redirects);
    }

    [Fact]
    public void Saving_a_stream_route_adds_it()
    {
        var stream = AStream();

        var state = ApiaryState.Empty.With(new StreamRouteSaved(stream));

        Assert.Same(stream, state.StreamRoutes[stream.Id]);
    }

    [Fact]
    public void Deleting_a_stream_route_removes_it()
    {
        var stream = AStream();

        var state = ApiaryState.Empty.With(new StreamRouteSaved(stream), new StreamRouteDeleted(stream.Id));

        Assert.Empty(state.StreamRoutes);
    }

    [Fact]
    public void A_maintenance_window_is_active_from_its_start() =>
        Assert.True(new MaintenanceWindow(TestClock.Now, TestClock.Now.AddHours(1)).IsActive(TestClock.Now));

    [Fact]
    public void A_maintenance_window_is_over_at_its_end() =>
        Assert.False(new MaintenanceWindow(TestClock.Now.AddHours(-1), TestClock.Now).IsActive(TestClock.Now));

    [Fact]
    public void A_maintenance_window_isn_t_active_before_its_start() =>
        Assert.False(new MaintenanceWindow(TestClock.Now.AddMinutes(1), TestClock.Now.AddHours(1)).IsActive(TestClock.Now));
}
