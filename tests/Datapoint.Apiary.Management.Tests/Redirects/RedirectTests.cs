using Datapoint.Apiary.Cluster.Redirects;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Redirects;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Management.Tests.Redirects;

public sealed class RedirectTests : IDisposable
{
    private readonly ManagementHost _host = new();
    private readonly Guid _projectId;

    public RedirectTests()
    {
        _host.SignedIn(Role.Operator);
        _projectId = _host.AProjectIn().Id;
    }

    public void Dispose() => _host.Dispose();

    [Fact]
    public async Task An_operator_creates_a_redirect()
    {
        var id = await _host.SendAsync(new CreateRedirect(_projectId, "WWW.Example.com", " https://example.com/ "));

        var redirect = _host.State.Redirects[id];
        Assert.Equal(("www.example.com", "https://example.com/", 308, true), (redirect.From, redirect.To, redirect.StatusCode, redirect.KeepPath));
    }

    [Fact]
    public async Task A_redirect_needs_an_existing_project() =>
        Assert.Contains("ProjectId: project.notFound", await _host.ErrorsAsync(new CreateRedirect(AnId(), "www.example.com", "https://example.com")));

    [Fact]
    public async Task A_wildcard_hostname_can_t_redirect() =>
        Assert.Equal(["From: redirect.wildcard"], await _host.ErrorsAsync(new CreateRedirect(_projectId, "*.example.com", "https://example.com")));

    [Fact]
    public async Task A_routed_hostname_can_t_redirect()
    {
        _host.Seed(new RouteSaved(ARoute(_projectId, host: "www.example.com")));

        Assert.Contains("From: redirect.routeExists", await _host.ErrorsAsync(new CreateRedirect(_projectId, "www.example.com", "https://example.com")));
    }

    [Fact]
    public async Task A_hostname_redirects_only_once()
    {
        _host.Seed(new RedirectSaved(ARedirect(_projectId, from: "www.example.com")));

        Assert.Contains("From: redirect.duplicate", await _host.ErrorsAsync(new CreateRedirect(_projectId, "www.example.com", "https://example.org")));
    }

    [Theory]
    [InlineData("example.com")]
    [InlineData("ftp://example.com")]
    [InlineData("https://example.com/#top")]
    public async Task A_target_that_isn_t_an_http_address_is_refused(string to) =>
        Assert.Contains("To: redirect.targetInvalid", await _host.ErrorsAsync(new CreateRedirect(_projectId, "www.example.com", to)));

    [Fact]
    public async Task A_path_alone_can_t_be_the_target_of_a_whole_hostname() =>
        Assert.Contains("To: redirect.relativeNeedsPath", await _host.ErrorsAsync(new CreateRedirect(_projectId, "www.example.com", "/new")));

    [Fact]
    public async Task An_operator_redirects_a_path_on_a_routed_hostname()
    {
        _host.Seed(new RouteSaved(ARoute(_projectId, host: "example.com")));

        var id = await _host.SendAsync(new CreateRedirect(_projectId, "example.com", "/new", Path: "/old/"));

        var redirect = _host.State.Redirects[id];
        Assert.Equal(("example.com", "/old", "/new"), (redirect.From, redirect.Path, redirect.To));
    }

    [Fact]
    public async Task A_redirect_without_a_path_takes_the_whole_hostname()
    {
        var id = await _host.SendAsync(new CreateRedirect(_projectId, "www.example.com", "https://example.com", Path: " "));

        Assert.Equal("/", _host.State.Redirects[id].Path);
    }

    [Theory]
    [InlineData("/api", "/api")]
    [InlineData("/api", "/API")]
    [InlineData("/api/v1", "/api")]
    public async Task A_redirect_can_t_hide_a_route(string routePath, string path)
    {
        _host.Seed(new RouteSaved(ARoute(_projectId, host: "example.com") with { Path = routePath }));

        Assert.Contains("Path: redirect.hidesRoute", await _host.ErrorsAsync(new CreateRedirect(_projectId, "example.com", "/new", Path: path)));
    }

    [Fact]
    public async Task A_redirect_next_to_a_route_s_path_is_allowed()
    {
        _host.Seed(new RouteSaved(ARoute(_projectId, host: "example.com") with { Path = "/api" }));

        Assert.Empty(await _host.ErrorsAsync(new CreateRedirect(_projectId, "example.com", "/new", Path: "/apiary")));
    }

    [Fact]
    public async Task A_path_redirects_only_once()
    {
        _host.Seed(new PathRedirectSaved(ARedirect(_projectId, from: "example.com") with { Path = "/old" }));

        Assert.Contains("Path: redirect.duplicate", await _host.ErrorsAsync(new CreateRedirect(_projectId, "example.com", "/new", Path: "/OLD")));
    }

    [Fact]
    public async Task A_path_and_its_whole_hostname_can_redirect_apart()
    {
        _host.Seed(new RedirectSaved(ARedirect(_projectId, from: "old.example.com")));

        Assert.Empty(await _host.ErrorsAsync(new CreateRedirect(_projectId, "old.example.com", "https://docs.example.com", Path: "/docs")));
    }

    [Theory]
    [InlineData("/.well-known/acme-challenge")]
    [InlineData("/.well-known/acme-challenge/token")]
    [InlineData("/.well-known")]
    public async Task Certificate_checks_can_t_be_redirected(string path) =>
        Assert.Contains("Path: redirect.pathReserved", await _host.ErrorsAsync(new CreateRedirect(_projectId, "example.com", "https://example.org", Path: path)));

    [Theory]
    [InlineData("old")]
    [InlineData("/old?x=1")]
    [InlineData("/a/../b")]
    public async Task A_path_that_isn_t_a_path_is_refused(string path) =>
        Assert.Contains("Path: path.invalid", await _host.ErrorsAsync(new CreateRedirect(_projectId, "example.com", "https://example.org", Path: path)));

    [Theory]
    [InlineData("//evil.example.com")]
    [InlineData("/\\evil.example.com")]
    [InlineData("/new page")]
    public async Task A_path_target_that_names_another_site_or_isn_t_a_path_is_refused(string to) =>
        Assert.Contains("To: redirect.targetInvalid", await _host.ErrorsAsync(new CreateRedirect(_projectId, "example.com", to, Path: "/old")));

    [Theory]
    [InlineData("/old")]
    [InlineData("/old/2026?ref=mail")]
    [InlineData("https://Example.com/old/page")]
    public async Task A_path_can_t_redirect_to_itself_or_under_it(string to) =>
        Assert.Contains("To: redirect.loop", await _host.ErrorsAsync(new CreateRedirect(_projectId, "example.com", to, Path: "/old")));

    [Theory]
    [InlineData("/older")]
    [InlineData("https://example.com/new")]
    [InlineData("https://www.example.com/old")]
    public async Task A_path_can_redirect_beside_itself(string to) =>
        Assert.Empty(await _host.ErrorsAsync(new CreateRedirect(_projectId, "example.com", to, Path: "/old")));

    [Fact]
    public async Task A_redirect_can_t_point_at_itself() =>
        Assert.Contains("To: redirect.loop", await _host.ErrorsAsync(new CreateRedirect(_projectId, "www.example.com", "https://WWW.example.com/home")));

    [Theory]
    [InlineData(301)]
    [InlineData(302)]
    [InlineData(307)]
    [InlineData(308)]
    public async Task A_redirect_status_is_301_302_307_or_308(int status) =>
        Assert.Empty(await _host.ErrorsAsync(new CreateRedirect(_projectId, "www.example.com", "https://example.com", status)));

    [Fact]
    public async Task Another_redirect_status_is_refused() =>
        Assert.Contains("StatusCode: redirect.statusCode", await _host.ErrorsAsync(new CreateRedirect(_projectId, "www.example.com", "https://example.com", 200)));

    [Fact]
    public async Task Deleting_a_redirect_removes_it()
    {
        var redirect = ARedirect(_projectId);
        _host.Seed(new RedirectSaved(redirect));

        await _host.SendAsync(new DeleteRedirect(redirect.Id));

        Assert.Empty(_host.State.Redirects);
    }

    [Fact]
    public async Task Deleting_an_unknown_redirect_fails() =>
        Assert.Equal(ErrorCodes.RedirectNotFound, await _host.FailureAsync(new DeleteRedirect(AnId())));

    [Fact]
    public async Task Checking_a_path_that_hides_a_route_warns()
    {
        _host.Seed(new RouteSaved(ARoute(_projectId, host: "example.com") with { Path = "/api" }));

        var checks = await _host.QueryAsync(new CheckRedirect("example.com", "/api"));

        Assert.Equal(("path", "redirect.hidesRoute"), (checks.Single().Field, checks.Single().Code));
    }

    [Fact]
    public async Task Checking_a_free_path_on_a_routed_hostname_finds_nothing()
    {
        _host.Seed(new RouteSaved(ARoute(_projectId, host: "example.com")));

        Assert.Empty(await _host.QueryAsync(new CheckRedirect("example.com", "/old")));
    }

    [Fact]
    public async Task Redirects_list_by_hostname_then_path()
    {
        _host.Seed(
            new PathRedirectSaved(ARedirect(_projectId, from: "example.com") with { Path = "/b" }),
            new RedirectSaved(ARedirect(_projectId, from: "example.com")),
            new PathRedirectSaved(ARedirect(_projectId, from: "example.com") with { Path = "/a" }));

        var redirects = await _host.QueryAsync(new ListRedirects());

        Assert.Equal(["/", "/a", "/b"], redirects.Select(r => r.Path));
    }

    [Fact]
    public async Task Checking_a_hostname_that_s_routed_warns()
    {
        _host.Seed(new RouteSaved(ARoute(_projectId, host: "www.example.com")));

        var checks = await _host.QueryAsync(new CheckRedirect("www.example.com"));

        Assert.Equal("redirect.routeExists", checks.Single().Code);
    }
}
