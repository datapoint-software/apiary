using Datapoint.Apiary.Cluster.Projects;
using Datapoint.Apiary.Cluster.Redirects;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Routes;
using Datapoint.Apiary.Security.Passwords;
using Datapoint.Apiary.Testing;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Management.Tests.Routes;

public sealed class ChangeRouteTests : IDisposable
{
    private readonly ManagementHost _host = new();
    private readonly Project _project;
    private readonly Route _route;

    public ChangeRouteTests()
    {
        _host.SignedIn(Role.Operator, "olga@example.com");
        _project = _host.AProjectIn();
        _route = ARoute(_project.Id);
        _host.Seed(new RouteSaved(_route));
    }

    public void Dispose() => _host.Dispose();

    [Fact]
    public async Task Updating_a_route_replaces_its_settings()
    {
        _host.Time.Advance(TimeSpan.FromMinutes(5));

        await _host.SendAsync(Update() with { Path = "/shop/", TimeoutSeconds = 60, Sticky = true });

        var route = _host.State.Routes[_route.Id];
        Assert.Equal(("/shop", 60, true), (route.Path, route.TimeoutSeconds, route.Sticky));
        Assert.Equal(("olga@example.com", TestClock.Now.AddMinutes(5)), (route.ChangedBy, route.ChangedAt));
    }

    [Fact]
    public async Task A_route_keeps_its_own_hostname_and_path_when_updated()
    {
        Assert.Empty(await _host.ErrorsAsync(Update()));
    }

    [Fact]
    public async Task A_route_can_t_take_another_route_s_hostname_and_path()
    {
        var other = ARoute(_project.Id, "blog.example.com");
        _host.Seed(new RouteSaved(other));

        Assert.Contains("Path: route.duplicate", await _host.ErrorsAsync(Update() with { Host = "blog.example.com" }));
    }

    [Fact]
    public async Task Updating_a_route_that_doesn_t_exist_says_so()
    {
        Assert.Equal(ErrorCodes.RouteNotFound, await _host.FailureAsync(Update() with { Id = Guid.NewGuid(), Host = "new.example.com" }));
    }

    [Fact]
    public async Task Strict_transport_for_subdomains_needs_strict_transport()
    {
        await _host.SendAsync(Update() with { StrictTransportSubdomains = true });

        Assert.False(_host.State.Routes[_route.Id].StrictTransportSubdomains);
    }

    [Fact]
    public async Task A_route_password_is_kept_as_a_hash()
    {
        await _host.SendAsync(Update() with { Password = new RoutePasswordSettings("a demo password") });

        var password = _host.State.Routes[_route.Id].Password!;
        Assert.True(PasswordHasher.Verify("a demo password", password.Hash));
        Assert.DoesNotContain("a demo password", password.Hash, StringComparison.Ordinal);
    }

    [Fact]
    public async Task A_route_password_is_kept_when_only_its_message_changes()
    {
        await _host.SendAsync(Update() with { Password = new RoutePasswordSettings("a demo password") });
        var before = _host.State.Routes[_route.Id].Password!;

        await _host.SendAsync(Update() with { Password = new RoutePasswordSettings(Message: "Ask Olga") });

        var after = _host.State.Routes[_route.Id].Password!;
        Assert.Equal((before.Hash, before.CookieKey, "Ask Olga"), (after.Hash, after.CookieKey, after.Message));
    }

    [Fact]
    public async Task A_new_route_password_signs_every_visitor_out()
    {
        await _host.SendAsync(Update() with { Password = new RoutePasswordSettings("a demo password") });
        var before = _host.State.Routes[_route.Id].Password!;

        await _host.SendAsync(Update() with { Password = new RoutePasswordSettings("another password") });

        Assert.NotEqual(before.CookieKey, _host.State.Routes[_route.Id].Password!.CookieKey);
    }

    [Fact]
    public async Task A_route_needs_a_password_before_it_can_ask_for_one()
    {
        Assert.Contains("Password.NewPassword: route.passwordRequired", await _host.ErrorsAsync(Update() with { Password = new RoutePasswordSettings() }));
    }

    [Fact]
    public async Task A_route_password_has_at_least_12_characters()
    {
        Assert.Contains("Password.NewPassword: route.passwordShort", await _host.ErrorsAsync(Update() with { Password = new RoutePasswordSettings("too short") }));
    }

    [Fact]
    public async Task Disabling_a_route_keeps_its_settings()
    {
        await _host.SendAsync(new DisableRoute(_route.Id));

        Assert.Equal(_route with { Disabled = true, ChangedBy = "olga@example.com", ChangedAt = TestClock.Now }, _host.State.Routes[_route.Id]);
    }

    [Fact]
    public async Task Enabling_a_route_turns_it_back_on()
    {
        await _host.SendAsync(new DisableRoute(_route.Id));

        await _host.SendAsync(new EnableRoute(_route.Id));

        Assert.False(_host.State.Routes[_route.Id].Disabled);
    }

    [Fact]
    public async Task Deleting_a_route_removes_it()
    {
        await _host.SendAsync(new DeleteRoute(_route.Id));

        Assert.Empty(_host.State.Routes);
    }

    [Fact]
    public async Task Deleting_a_route_twice_says_it_s_gone()
    {
        await _host.SendAsync(new DeleteRoute(_route.Id));

        Assert.Equal(ErrorCodes.RouteNotFound, await _host.FailureAsync(new DeleteRoute(_route.Id)));
    }

    [Fact]
    public async Task Moving_routes_changes_only_their_project()
    {
        var target = AProject("Blog");
        _host.Seed(new ProjectSaved(target));

        await _host.SendAsync(new MoveRoutes([_route.Id, _route.Id], target.Id));

        Assert.Equal(_route with { ProjectId = target.Id }, _host.State.Routes[_route.Id]);
    }

    [Fact]
    public async Task Moving_routes_moves_none_if_one_is_missing()
    {
        var target = AProject("Blog");
        _host.Seed(new ProjectSaved(target));

        Assert.Equal(ErrorCodes.RouteNotFound, await _host.FailureAsync(new MoveRoutes([_route.Id, Guid.NewGuid()], target.Id)));
        Assert.Equal(_project.Id, _host.State.Routes[_route.Id].ProjectId);
    }

    [Fact]
    public async Task Routes_move_into_an_existing_project()
    {
        Assert.Contains("ProjectId: project.notFound", await _host.ErrorsAsync(new MoveRoutes([_route.Id], Guid.NewGuid())));
    }

    [Fact]
    public async Task At_most_500_routes_move_at_once()
    {
        Assert.Contains("Ids: tooLong", await _host.ErrorsAsync(new MoveRoutes([.. Enumerable.Range(0, 501).Select(_ => Guid.NewGuid())], _project.Id)));
    }

    [Fact]
    public async Task Checking_a_route_warns_about_a_duplicate()
    {
        var checks = await _host.QueryAsync(new CheckRoute("shop.example.com", "/"));

        Assert.Equal(("path", ErrorCodes.RouteDuplicate), (checks.Single().Field, checks.Single().Code));
    }

    [Fact]
    public async Task Checking_the_route_being_edited_finds_nothing()
    {
        Assert.Empty(await _host.QueryAsync(new CheckRoute("shop.example.com", "/", _route.Id)));
    }

    [Fact]
    public async Task Checking_a_route_warns_about_a_redirect_on_its_hostname()
    {
        _host.Seed(new RedirectSaved(ARedirect(_project.Id, "www.example.com")));

        var checks = await _host.QueryAsync(new CheckRoute("www.example.com", "/"));

        Assert.Equal(("host", ErrorCodes.RouteRedirectExists), (checks.Single().Field, checks.Single().Code));
    }

    private UpdateRoute Update() => new(_route.Id, _project.Id, _route.Host, _route.Path, [ATarget()]);
}
