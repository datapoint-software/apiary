using Datapoint.Apiary.Cluster.Proxies;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Proxies;
using Datapoint.Apiary.Management.Routes;
using Datapoint.Apiary.Testing;
using Datapoint.Mediator.Authorization;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Management.Tests.Proxies;

public sealed class TrustedProxiesTests : IDisposable
{
    private readonly ManagementHost _host = new();

    public void Dispose() => _host.Dispose();

    [Fact]
    public async Task An_administrator_trusts_a_proxy()
    {
        _host.SignedIn();

        var id = await _host.SendAsync(new AddTrustedProxy("10.20.30.0/24", "Load balancer"));

        Assert.Equal(new TrustedProxy(id, "10.20.30.0/24", "Load balancer"), _host.State.TrustedProxies[id]);
    }

    [Theory]
    [InlineData(" 2400:CB00::/32 ", "2400:cb00::/32")]
    [InlineData("10.0.0.1", "10.0.0.1")]
    public async Task A_range_is_stored_the_way_it_s_compared(string range, string stored)
    {
        _host.SignedIn();

        var id = await _host.SendAsync(new AddTrustedProxy(range));

        Assert.Equal(stored, _host.State.TrustedProxies[id].Range);
    }

    [Fact]
    public async Task A_blank_note_isn_t_kept()
    {
        _host.SignedIn();

        var id = await _host.SendAsync(new AddTrustedProxy("10.20.30.0/24", "  "));

        Assert.Null(_host.State.TrustedProxies[id].Note);
    }

    [Fact]
    public async Task An_operator_can_t_trust_a_proxy()
    {
        _host.SignedIn(Role.Operator);

        await Assert.ThrowsAsync<AccessDeniedException>(() => _host.SendAsync(new AddTrustedProxy("10.20.30.0/24")));
    }

    [Theory]
    [InlineData("", ErrorCodes.Required)]
    [InlineData("10.20.30.0/33", ErrorCodes.IpRangeInvalid)]
    [InlineData("proxy.example.com", ErrorCodes.IpRangeInvalid)]
    [InlineData("0.0.0.0/0", ErrorCodes.TrustedProxyEverything)]
    [InlineData("::/0", ErrorCodes.TrustedProxyEverything)]
    public async Task A_range_that_can_t_be_trusted_is_refused(string range, string code)
    {
        _host.SignedIn();

        Assert.Contains($"Range: {code}", await _host.ErrorsAsync(new AddTrustedProxy(range)));
    }

    [Fact]
    public async Task A_range_already_trusted_is_refused()
    {
        _host.SignedIn();
        _host.Seed(new TrustedProxySaved(new TrustedProxy(AnId(), "10.20.30.0/24", null)));

        Assert.Contains($"Range: {ErrorCodes.TrustedProxyDuplicate}", await _host.ErrorsAsync(new AddTrustedProxy("10.20.30.0/24")));
    }

    [Fact]
    public async Task A_note_over_100_characters_is_refused()
    {
        _host.SignedIn();

        Assert.Contains($"Note: {ErrorCodes.TooLong}", await _host.ErrorsAsync(new AddTrustedProxy("10.20.30.0/24", new string('a', 101))));
    }

    [Fact]
    public async Task At_most_100_proxies_are_trusted()
    {
        _host.SignedIn();
        _host.Seed([.. Enumerable.Range(0, 100).Select(i => new TrustedProxySaved(new TrustedProxy(AnId(), $"10.0.{i}.0/24", null)))]);

        Assert.Contains($"Range: {ErrorCodes.IpRangeTooMany}", await _host.ErrorsAsync(new AddTrustedProxy("10.1.0.0/24")));
    }

    [Fact]
    public async Task An_administrator_changes_a_proxy_s_range_and_note()
    {
        _host.SignedIn();
        var proxy = new TrustedProxy(AnId(), "10.20.30.0/24", "Old");
        _host.Seed(new TrustedProxySaved(proxy));

        await _host.SendAsync(new UpdateTrustedProxy(proxy.Id, "10.20.31.0/24", "New"));

        Assert.Equal(proxy with { Range = "10.20.31.0/24", Note = "New" }, _host.State.TrustedProxies[proxy.Id]);
    }

    [Fact]
    public async Task A_proxy_keeps_its_own_range_when_its_note_changes()
    {
        _host.SignedIn();
        var proxy = new TrustedProxy(AnId(), "10.20.30.0/24", "Old");
        _host.Seed(new TrustedProxySaved(proxy));

        await _host.SendAsync(new UpdateTrustedProxy(proxy.Id, "10.20.30.0/24", "New"));

        Assert.Equal("New", _host.State.TrustedProxies[proxy.Id].Note);
    }

    [Fact]
    public async Task Changing_a_proxy_that_isn_t_trusted_fails()
    {
        _host.SignedIn();

        var failure = await Assert.ThrowsAsync<ActionFailedException>(() => _host.SendAsync(new UpdateTrustedProxy(AnId(), "10.20.30.0/24")));

        Assert.Equal(ErrorCodes.TrustedProxyNotFound, failure.Code);
    }

    [Fact]
    public async Task An_administrator_stops_trusting_a_proxy()
    {
        _host.SignedIn();
        var proxy = new TrustedProxy(AnId(), "10.20.30.0/24", null);
        _host.Seed(new TrustedProxySaved(proxy));

        await _host.SendAsync(new RemoveTrustedProxy(proxy.Id));

        Assert.Empty(_host.State.TrustedProxies);
    }

    [Fact]
    public async Task Removing_a_trusted_proxy_is_audited_with_its_range()
    {
        var user = _host.SignedIn();
        var proxy = new TrustedProxy(AnId(), "10.20.30.0/24", null);
        _host.Seed(new TrustedProxySaved(proxy));

        await _host.SendAsync(new RemoveTrustedProxy(proxy.Id));

        var entry = _host.State.Audit.Single();
        Assert.Equal(("trusted-proxies.remove", user.Email, "10.20.30.0/24"), (entry.Action, entry.User, Assert.Single(entry.Affected)));
    }

    [Fact]
    public async Task A_viewer_sees_the_trusted_proxies_and_their_latest_request()
    {
        _host.SignedIn(Role.Viewer);
        var proxy = new TrustedProxy(AnId(), "173.245.48.0/20", "Cloudflare");
        _host.Seed(new TrustedProxySaved(proxy));
        _host.Telemetry.Readings[proxy.Id] = RouteTelemetry.Unknown with { LastConnectionAt = TestClock.Now };

        var view = Assert.Single(await _host.QueryAsync(new ListTrustedProxies()));

        Assert.Equal(new TrustedProxyView(proxy.Id, "173.245.48.0/20", "Cloudflare", Public: true, TestClock.Now), view);
    }

    [Theory]
    [InlineData("10.20.30.0/24", false)]
    [InlineData("fd00::/8", false)]
    [InlineData("173.245.48.0/20", true)]
    [InlineData("10.0.0.0/7", true)]
    public void Ranges_outside_private_networks_are_public(string range, bool isPublic) =>
        Assert.Equal(isPublic, TrustedProxyRanges.IsPublic(range));
}
