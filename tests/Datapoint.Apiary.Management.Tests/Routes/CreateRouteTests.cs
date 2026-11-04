using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Cluster.Redirects;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Routes;
using Datapoint.Apiary.Testing;
using Datapoint.Mediator.Authorization;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Management.Tests.Routes;

public sealed class CreateRouteTests : IDisposable
{
    private readonly ManagementHost _host = new();

    public void Dispose() => _host.Dispose();

    [Fact]
    public async Task An_operator_creates_a_route()
    {
        _host.SignedIn(Role.Operator);
        var project = _host.AProjectIn();

        var id = await _host.SendAsync(ACreateRoute(project.Id));

        Assert.Equal(("shop.example.com", "/", project.Id), (_host.State.Routes[id].Host, _host.State.Routes[id].Path, _host.State.Routes[id].ProjectId));
    }

    [Fact]
    public async Task A_viewer_can_t_create_a_route()
    {
        _host.SignedIn(Role.Viewer);
        var project = _host.AProjectIn();

        await Assert.ThrowsAsync<AccessDeniedException>(() => _host.SendAsync(ACreateRoute(project.Id)));
    }

    [Fact]
    public async Task Someone_who_isn_t_signed_in_can_t_create_a_route()
    {
        var project = _host.AProjectIn();

        await Assert.ThrowsAsync<AuthenticationRequiredException>(() => _host.SendAsync(ACreateRoute(project.Id)));
    }

    [Fact]
    public async Task A_new_route_records_who_made_it_and_when()
    {
        _host.SignedIn(Role.Operator, "olga@example.com");
        var project = _host.AProjectIn();

        var id = await _host.SendAsync(ACreateRoute(project.Id));

        Assert.Equal(("olga@example.com", TestClock.Now), (_host.State.Routes[id].ChangedBy, _host.State.Routes[id].ChangedAt));
    }

    [Fact]
    public async Task Creating_a_route_is_audited()
    {
        var user = _host.SignedIn(Role.Operator);
        var project = _host.AProjectIn();

        var id = await _host.SendAsync(ACreateRoute(project.Id));

        var entry = _host.State.Audit.Single();
        Assert.Equal(("routes.create", user.Email, user.Id, project.Id, id.ToString(), AuditOutcome.Succeeded), (entry.Action, entry.User, entry.UserId, entry.ProjectId, entry.Affected.Single(), entry.Outcome));
    }

    [Fact]
    public async Task The_audit_records_where_the_change_came_from()
    {
        _host.SignedIn(Role.Operator);
        var project = _host.AProjectIn();

        await _host.SendAsync(ACreateRoute(project.Id));

        Assert.Equal(("192.0.2.10", "Firefox"), (_host.State.Audit.Single().Address, _host.State.Audit.Single().Client));
    }

    [Fact]
    public async Task The_hostname_is_stored_in_lowercase()
    {
        _host.SignedIn();
        var project = _host.AProjectIn();

        var id = await _host.SendAsync(ACreateRoute(project.Id) with { Host = "Shop.Example.COM" });

        Assert.Equal("shop.example.com", _host.State.Routes[id].Host);
    }

    [Fact]
    public async Task A_trailing_slash_is_removed_from_the_path()
    {
        _host.SignedIn();
        var project = _host.AProjectIn();

        var id = await _host.SendAsync(ACreateRoute(project.Id) with { Path = "/api/" });

        Assert.Equal("/api", _host.State.Routes[id].Path);
    }

    [Fact]
    public async Task A_single_target_takes_all_the_traffic()
    {
        _host.SignedIn();
        var project = _host.AProjectIn();

        var id = await _host.SendAsync(ACreateRoute(project.Id) with { Targets = [ATarget(weight: 30)] });

        Assert.Equal(100, _host.State.Routes[id].Targets.Single().Weight);
    }

    [Fact]
    public async Task A_target_name_is_stored_in_lowercase()
    {
        _host.SignedIn();
        var project = _host.AProjectIn();

        var id = await _host.SendAsync(ACreateRoute(project.Id) with { Targets = [ATarget("Shop_Web")] });

        Assert.Equal("shop_web", _host.State.Routes[id].Targets.Single().Host);
    }

    [Fact]
    public async Task Allowed_addresses_are_trimmed_and_deduplicated()
    {
        _host.SignedIn();
        var project = _host.AProjectIn();

        var id = await _host.SendAsync(ACreateRoute(project.Id) with { AllowedAddresses = [" 10.0.0.0/8", "10.0.0.0/8", ""] });

        Assert.Equal(["10.0.0.0/8"], _host.State.Routes[id].AllowedAddresses);
    }

    [Fact]
    public async Task No_allowed_addresses_allows_everyone()
    {
        _host.SignedIn();
        var project = _host.AProjectIn();

        var id = await _host.SendAsync(ACreateRoute(project.Id) with { AllowedAddresses = [" "] });

        Assert.Null(_host.State.Routes[id].AllowedAddresses);
    }

    [Fact]
    public async Task Subdomains_aren_t_covered_by_strict_transport_unless_it_s_on()
    {
        _host.SignedIn();
        var project = _host.AProjectIn();

        var id = await _host.SendAsync(ACreateRoute(project.Id) with { StrictTransport = false, StrictTransportSubdomains = true });

        Assert.False(_host.State.Routes[id].StrictTransportSubdomains);
    }

    [Fact]
    public async Task A_canary_needs_two_targets_to_be_kept()
    {
        _host.SignedIn();
        var project = _host.AProjectIn();

        var id = await _host.SendAsync(ACreateRoute(project.Id) with { Canary = new RouteCanary(CanarySource.Header, "X-Canary", "yes") });

        Assert.Null(_host.State.Routes[id].Canary);
    }

    [Fact]
    public async Task A_password_is_stored_only_as_a_hash()
    {
        _host.SignedIn();
        var project = _host.AProjectIn();

        var id = await _host.SendAsync(ACreateRoute(project.Id) with { Password = new RoutePasswordSettings("a long shared password") });

        Assert.DoesNotContain("a long shared password", _host.State.Routes[id].Password?.Hash ?? "", StringComparison.Ordinal);
    }

    [Fact]
    public async Task A_route_needs_an_existing_project()
    {
        _host.SignedIn();

        Assert.Contains("ProjectId: project.notFound", await _host.ErrorsAsync(ACreateRoute(AnId())));
    }

    [Theory]
    [InlineData("", "hostname.required")]
    [InlineData("https://shop.example.com", "hostname.scheme")]
    [InlineData("shop.example.com/api", "hostname.path")]
    [InlineData("192.0.2.1", "hostname.address")]
    [InlineData("shop", "hostname.notFull")]
    [InlineData("shop..example.com", "hostname.consecutiveDots")]
    [InlineData("shop_web.example.com", "hostname.label")]
    [InlineData("-shop.example.com", "hostname.label")]
    public async Task A_hostname_that_isn_t_valid_is_refused(string host, string code)
    {
        _host.SignedIn();
        var project = _host.AProjectIn();

        Assert.Contains($"Host: {code}", await _host.ErrorsAsync(ACreateRoute(project.Id) with { Host = host }));
    }

    [Theory]
    [InlineData("")]
    [InlineData("api")]
    [InlineData("/api?x=1")]
    [InlineData("/api#top")]
    [InlineData("/../etc")]
    [InlineData("//api")]
    [InlineData("/my api")]
    public async Task A_path_that_isn_t_valid_is_refused(string path)
    {
        _host.SignedIn();
        var project = _host.AProjectIn();

        Assert.Single(await _host.ErrorsAsync(ACreateRoute(project.Id) with { Path = path }), e => e.StartsWith("Path: ", StringComparison.Ordinal));
    }

    [Theory]
    [InlineData("127.0.0.1", "target.loopback")]
    [InlineData("localhost", "target.loopback")]
    [InlineData("::1", "target.loopback")]
    [InlineData("169.254.169.254", "target.linkLocal")]
    [InlineData("0.0.0.0", "target.unspecified")]
    [InlineData("shop_web:8080", "target.port")]
    [InlineData("", "target.required")]
    [InlineData("shop web", "target.invalid")]
    public async Task A_target_that_isn_t_allowed_is_refused(string target, string code)
    {
        _host.SignedIn();
        var project = _host.AProjectIn();

        Assert.Contains($"Targets[0].Host: {code}", await _host.ErrorsAsync(ACreateRoute(project.Id) with { Targets = [ATarget(target)] }));
    }

    [Theory]
    [InlineData("shop_web")]
    [InlineData("shop-web")]
    [InlineData("10.0.1.5")]
    [InlineData("shop.internal.example.com")]
    public async Task A_service_name_or_address_is_a_valid_target(string target)
    {
        _host.SignedIn();
        var project = _host.AProjectIn();

        Assert.Empty(await _host.ErrorsAsync(ACreateRoute(project.Id) with { Targets = [ATarget(target)] }));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(65536)]
    public async Task A_target_port_out_of_range_is_refused(int port)
    {
        _host.SignedIn();
        var project = _host.AProjectIn();

        Assert.Contains("Targets[0].Port: range", await _host.ErrorsAsync(ACreateRoute(project.Id) with { Targets = [ATarget(port: port)] }));
    }

    [Fact]
    public async Task A_route_needs_a_target()
    {
        _host.SignedIn();
        var project = _host.AProjectIn();

        Assert.Contains("Targets: route.targetsRequired", await _host.ErrorsAsync(ACreateRoute(project.Id) with { Targets = [] }));
    }

    [Fact]
    public async Task A_route_has_at_most_10_targets()
    {
        _host.SignedIn();
        var project = _host.AProjectIn();

        Assert.Contains("Targets: route.targetsTooMany", await _host.ErrorsAsync(ACreateRoute(project.Id) with { Targets = [.. Enumerable.Repeat(ATarget(weight: 10), 11)] }));
    }

    [Fact]
    public async Task The_weights_of_several_targets_add_up_to_100()
    {
        _host.SignedIn();
        var project = _host.AProjectIn();

        Assert.Contains("Targets: route.weightsTotal", await _host.ErrorsAsync(ACreateRoute(project.Id) with { Targets = [ATarget(weight: 50), ATarget("shop_new", weight: 40)] }));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(121)]
    public async Task A_timeout_out_of_range_is_refused(int seconds)
    {
        _host.SignedIn();
        var project = _host.AProjectIn();

        Assert.Contains("TimeoutSeconds: range", await _host.ErrorsAsync(ACreateRoute(project.Id) with { TimeoutSeconds = seconds }));
    }

    [Fact]
    public async Task The_same_hostname_and_path_can_t_be_routed_twice()
    {
        _host.SignedIn();
        var project = _host.AProjectIn();
        _host.Seed(new RouteSaved(ARoute(project.Id)));

        Assert.Contains("Path: route.duplicate", await _host.ErrorsAsync(ACreateRoute(project.Id) with { Host = "SHOP.example.com", Path = "/" }));
    }

    [Fact]
    public async Task The_same_hostname_can_be_routed_on_another_path()
    {
        _host.SignedIn();
        var project = _host.AProjectIn();
        _host.Seed(new RouteSaved(ARoute(project.Id)));

        Assert.Empty(await _host.ErrorsAsync(ACreateRoute(project.Id) with { Path = "/api" }));
    }

    [Fact]
    public async Task A_hostname_that_redirects_can_t_be_routed()
    {
        _host.SignedIn();
        var project = _host.AProjectIn();
        _host.Seed(new RedirectSaved(ARedirect(project.Id, from: "shop.example.com")));

        Assert.Contains("Host: route.redirectExists", await _host.ErrorsAsync(ACreateRoute(project.Id)));
    }

    [Fact]
    public async Task An_unknown_certificate_is_refused()
    {
        _host.SignedIn();
        var project = _host.AProjectIn();

        Assert.Contains("CertificateId: certificate.notFound", await _host.ErrorsAsync(ACreateRoute(project.Id) with { CertificateId = AnId() }));
    }

    [Fact]
    public async Task An_automatic_certificate_can_t_be_chosen()
    {
        _host.SignedIn();
        var project = _host.AProjectIn();
        var certificate = ACertificate();
        _host.Seed(new CertificateSaved(certificate));

        Assert.Contains("CertificateId: certificate.notUploaded", await _host.ErrorsAsync(ACreateRoute(project.Id) with { CertificateId = certificate.Id }));
    }

    [Fact]
    public async Task An_uploaded_certificate_must_cover_the_hostname()
    {
        _host.SignedIn();
        var project = _host.AProjectIn();
        var certificate = ACertificate() with { Source = CertificateSource.Uploaded, Material = SomeMaterial("blog.example.com") };
        _host.Seed(new CertificateSaved(certificate));

        Assert.Contains("CertificateId: certificate.doesNotCover", await _host.ErrorsAsync(ACreateRoute(project.Id) with { CertificateId = certificate.Id }));
    }

    [Fact]
    public async Task An_uploaded_certificate_that_covers_the_hostname_is_accepted()
    {
        _host.SignedIn();
        var project = _host.AProjectIn();
        var certificate = ACertificate() with { Source = CertificateSource.Uploaded, Material = SomeMaterial("*.example.com") };
        _host.Seed(new CertificateSaved(certificate));

        Assert.Empty(await _host.ErrorsAsync(ACreateRoute(project.Id) with { CertificateId = certificate.Id }));
    }

    [Theory]
    [InlineData("10.0.0.0/8")]
    [InlineData("192.0.2.10")]
    [InlineData("2001:db8::/32")]
    public async Task An_address_or_range_is_a_valid_allowed_address(string address)
    {
        _host.SignedIn();
        var project = _host.AProjectIn();

        Assert.Empty(await _host.ErrorsAsync(ACreateRoute(project.Id) with { AllowedAddresses = [address] }));
    }

    [Fact]
    public async Task An_allowed_address_that_isn_t_an_address_is_refused()
    {
        _host.SignedIn();
        var project = _host.AProjectIn();

        Assert.Contains("AllowedAddresses: ipRange.invalid", await _host.ErrorsAsync(ACreateRoute(project.Id) with { AllowedAddresses = ["office"] }));
    }

    [Fact]
    public async Task A_route_allows_at_most_100_addresses()
    {
        _host.SignedIn();
        var project = _host.AProjectIn();
        IReadOnlyList<string> addresses = [.. Enumerable.Range(1, 101).Select(i => $"10.0.{i}.0/24")];

        Assert.Contains("AllowedAddresses: ipRange.tooMany", await _host.ErrorsAsync(ACreateRoute(project.Id) with { AllowedAddresses = addresses }));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(100_001)]
    public async Task A_rate_limit_out_of_range_is_refused(int limit)
    {
        _host.SignedIn();
        var project = _host.AProjectIn();

        Assert.Contains("RateLimit: range", await _host.ErrorsAsync(ACreateRoute(project.Id) with { RateLimit = limit }));
    }

    [Fact]
    public async Task A_maintenance_window_must_end_after_it_starts()
    {
        _host.SignedIn();
        var project = _host.AProjectIn();

        Assert.Contains("Maintenance.End: maintenance.endBeforeStart", await _host.ErrorsAsync(ACreateRoute(project.Id) with { Maintenance = new MaintenanceWindow(TestClock.Now.AddHours(2), TestClock.Now.AddHours(1)) }));
    }

    [Fact]
    public async Task A_maintenance_window_lasts_at_most_7_days()
    {
        _host.SignedIn();
        var project = _host.AProjectIn();

        Assert.Contains("Maintenance.End: maintenance.tooLong", await _host.ErrorsAsync(ACreateRoute(project.Id) with { Maintenance = new MaintenanceWindow(TestClock.Now, TestClock.Now.AddDays(8)) }));
    }

    [Fact]
    public async Task A_maintenance_window_must_end_in_the_future()
    {
        _host.SignedIn();
        var project = _host.AProjectIn();

        Assert.Contains("Maintenance.End: maintenance.ended", await _host.ErrorsAsync(ACreateRoute(project.Id) with { Maintenance = new MaintenanceWindow(TestClock.Now.AddHours(-2), TestClock.Now.AddHours(-1)) }));
    }

    [Theory]
    [InlineData("X Canary", "yes", "Canary.Name: route.canaryName")]
    [InlineData("X-Canary", "", "Canary.Value: required")]
    [InlineData("X-Canary", "a;b", "Canary.Value: invalid")]
    public async Task A_canary_that_isn_t_valid_is_refused(string name, string value, string error)
    {
        _host.SignedIn();
        var project = _host.AProjectIn();
        var command = ACreateRoute(project.Id) with { Targets = [ATarget(weight: 90), ATarget("shop_new", weight: 10)], Canary = new RouteCanary(CanarySource.Cookie, name, value) };

        Assert.Contains(error, await _host.ErrorsAsync(command));
    }

    [Fact]
    public async Task A_new_password_protected_route_needs_a_password()
    {
        _host.SignedIn();
        var project = _host.AProjectIn();

        Assert.Contains("Password.NewPassword: route.passwordRequired", await _host.ErrorsAsync(ACreateRoute(project.Id) with { Password = new RoutePasswordSettings() }));
    }

    [Fact]
    public async Task A_route_password_has_at_least_12_characters()
    {
        _host.SignedIn();
        var project = _host.AProjectIn();

        Assert.Contains("Password.NewPassword: route.passwordShort", await _host.ErrorsAsync(ACreateRoute(project.Id) with { Password = new RoutePasswordSettings("too short") }));
    }

    [Fact]
    public async Task A_route_password_lasts_1_7_or_30_days()
    {
        _host.SignedIn();
        var project = _host.AProjectIn();

        Assert.Contains("Password.Days: invalid", await _host.ErrorsAsync(ACreateRoute(project.Id) with { Password = new RoutePasswordSettings("a long shared password", Days: 3) }));
    }

    [Fact]
    public async Task A_password_link_needs_a_key()
    {
        _host.SignedIn();
        var project = _host.AProjectIn();

        Assert.Contains("Password.NewLinkKey: route.linkKeyRequired", await _host.ErrorsAsync(ACreateRoute(project.Id) with { Password = new RoutePasswordSettings("a long shared password", Link: true) }));
    }

    [Theory]
    [InlineData("short")]
    [InlineData("not+base64url/at=all+not+base64url")]
    public async Task A_link_key_that_isn_t_long_random_base64url_is_refused(string key)
    {
        _host.SignedIn();
        var project = _host.AProjectIn();

        Assert.Contains("Password.NewLinkKey: route.linkKeyInvalid", await _host.ErrorsAsync(ACreateRoute(project.Id) with { Password = new RoutePasswordSettings("a long shared password", Link: true, NewLinkKey: key) }));
    }

    [Fact]
    public async Task Nothing_is_saved_when_a_route_is_refused()
    {
        _host.SignedIn();
        var project = _host.AProjectIn();

        await _host.ErrorsAsync(ACreateRoute(project.Id) with { Host = "" });

        Assert.Empty(_host.Cluster.Entries);
    }

    [Fact]
    public async Task A_route_can_t_be_created_without_a_majority()
    {
        _host.SignedIn();
        var project = _host.AProjectIn();
        _host.Cluster.IsWritable = false;

        Assert.Equal(ErrorCodes.NoQuorum, await _host.FailureAsync(ACreateRoute(project.Id)));
    }

    [Fact]
    public async Task A_replica_that_doesn_t_lead_forwards_the_command()
    {
        _host.SignedIn();
        var project = _host.AProjectIn();
        _host.Cluster.IsLeader = false;

        await _host.SendAsync(ACreateRoute(project.Id));

        Assert.Equal((1, 0), (_host.Forwarder.Forwarded.Count, _host.Cluster.Entries.Count));
    }

    private static CreateRoute ACreateRoute(Guid projectId) => new(projectId, "shop.example.com", "/", [ATarget()]);
}
