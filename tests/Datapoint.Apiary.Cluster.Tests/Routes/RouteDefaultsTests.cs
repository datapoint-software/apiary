using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Testing.Builders;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Cluster.Tests.Routes;

public sealed class RouteDefaultsTests
{
    [Fact]
    public void Routes_accept_30_MB_by_default() =>
        Assert.Equal(30_000_000, RouteDefaults.MaxRequestBodySize(ApiaryState.Empty, ARoute()));

    [Fact]
    public void A_route_using_the_default_follows_the_saved_default()
    {
        var state = ApiaryState.Empty.With(new RouteDefaultsSaved(new RouteDefaults(5000)));

        Assert.Equal(5_000_000_000, RouteDefaults.MaxRequestBodySize(state, ARoute()));
    }

    [Fact]
    public void A_route_with_its_own_size_ignores_the_default()
    {
        var state = ApiaryState.Empty.With(new RouteDefaultsSaved(new RouteDefaults(5000)));
        var route = ARoute() with { RequestSize = RequestSizeLimit.Custom, RequestMegabytes = 100 };

        Assert.Equal(100_000_000, RouteDefaults.MaxRequestBodySize(state, route));
    }

    [Fact]
    public void An_unlimited_route_has_no_limit()
    {
        var route = ARoute() with { RequestSize = RequestSizeLimit.Unlimited };

        Assert.Null(RouteDefaults.MaxRequestBodySize(ApiaryState.Empty, route));
    }

    [Fact]
    public void Saving_the_defaults_replaces_them() =>
        Assert.Equal(new RouteDefaults(60), ApiaryState.Empty.With(new RouteDefaultsSaved(new RouteDefaults(30)), new RouteDefaultsSaved(new RouteDefaults(60))).RouteDefaults);
}
