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
    [InlineData("/relative")]
    public async Task A_target_that_isn_t_an_http_address_is_refused(string to) =>
        Assert.Contains("To: redirect.targetInvalid", await _host.ErrorsAsync(new CreateRedirect(_projectId, "www.example.com", to)));

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
    public async Task Checking_a_hostname_that_s_routed_warns()
    {
        _host.Seed(new RouteSaved(ARoute(_projectId, host: "www.example.com")));

        var checks = await _host.QueryAsync(new CheckRedirect("www.example.com"));

        Assert.Equal("redirect.routeExists", checks.Single().Code);
    }
}
