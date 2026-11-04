using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Routes;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Tests.Routes;

public sealed class RouteDefaultsTests : IDisposable
{
    private readonly ManagementHost _host = new();

    public void Dispose() => _host.Dispose();

    [Fact]
    public async Task Routes_accept_30_MB_until_an_administrator_changes_it()
    {
        _host.SignedIn(Role.Viewer);

        var defaults = await _host.QueryAsync(new GetRouteDefaults());

        Assert.Equal(30, defaults.RequestMegabytes);
    }

    [Fact]
    public async Task An_administrator_changes_the_default_request_size()
    {
        _host.SignedIn();

        await _host.SendAsync(new UpdateRouteDefaults(5000));

        Assert.Equal(new RouteDefaults(5000), _host.State.RouteDefaults);
    }

    [Fact]
    public async Task An_operator_can_t_change_the_default_request_size()
    {
        _host.SignedIn(Role.Operator);

        await Assert.ThrowsAsync<AccessDeniedException>(() => _host.SendAsync(new UpdateRouteDefaults(5000)));
    }

    [Fact]
    public async Task Changing_the_default_request_size_is_audited()
    {
        var user = _host.SignedIn();

        await _host.SendAsync(new UpdateRouteDefaults(5000));

        var entry = _host.State.Audit.Single();
        Assert.Equal(("routes.update-defaults", user.Email, AuditOutcome.Succeeded), (entry.Action, entry.User, entry.Outcome));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(100_001)]
    public async Task A_default_request_size_out_of_range_is_refused(int megabytes)
    {
        _host.SignedIn();

        Assert.Contains("RequestMegabytes: route.requestSize", await _host.ErrorsAsync(new UpdateRouteDefaults(megabytes)));
    }
}
