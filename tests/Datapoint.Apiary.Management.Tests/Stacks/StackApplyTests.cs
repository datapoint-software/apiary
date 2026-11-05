using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.Stacks;
using Datapoint.Apiary.Cluster.Streams;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Stacks;
using Datapoint.Mediator.Authorization;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Management.Tests.Stacks;

public sealed class StackApplyTests : IDisposable
{
    private readonly ManagementHost _host = new();
    private readonly PipelineToken _token = APipelineToken();

    public StackApplyTests()
    {
        _host.AProjectIn();
        _host.Seed(new StackSaved(AStack()), new PipelineTokenSaved(_token));
        _host.SignedInAsPipeline(_token);
    }

    public void Dispose() => _host.Dispose();

    [Fact]
    public async Task An_apply_adds_the_routes_the_stack_file_declares()
    {
        var plan = await _host.SendAsync(AnApply(routes: [AWebRoute()]));

        var route = Assert.Single(_host.State.Routes.Values);
        Assert.Equal(("shop.example.com", "/", new RouteTarget("shop_web", 8080, 100), "web"), (route.Host, route.Path, route.Targets.Single(), route.Stack?.Name));
        Assert.Equal("shop.example.com", Assert.Single(plan.Added).Name);
    }

    [Fact]
    public async Task An_apply_locks_only_the_fields_its_labels_set()
    {
        await _host.SendAsync(AnApply(routes: [AWebRoute() with { TimeoutSeconds = 60 }]));

        Assert.Equal(["host", "path", "targets", "timeout"], Assert.Single(_host.State.Routes.Values).Stack!.Fields);
    }

    [Fact]
    public async Task An_apply_changes_what_the_labels_changed()
    {
        await _host.SendAsync(AnApply(routes: [AWebRoute()]));

        var plan = await _host.SendAsync(AnApply(routes: [AWebRoute() with { Port = 9090 }]));

        var change = Assert.Single(plan.Changed);
        Assert.Equal(("targets", "shop_web:8080", "shop_web:9090"), (change.Field, change.From, change.To));
    }

    [Fact]
    public async Task An_apply_removes_the_routes_missing_from_the_stack_file()
    {
        await _host.SendAsync(AnApply(routes: [AWebRoute(), AWebRoute() with { Name = "api", Path = "/api" }]));

        var plan = await _host.SendAsync(AnApply(routes: [AWebRoute()]));

        Assert.Equal("shop.example.com/api", Assert.Single(plan.Removed).Name);
        Assert.Single(_host.State.Routes.Values);
    }

    [Fact]
    public async Task An_apply_with_nothing_new_changes_nothing()
    {
        await _host.SendAsync(AnApply(routes: [AWebRoute()]));
        var before = _host.State.Routes.Values.Single();

        var plan = await _host.SendAsync(AnApply(routes: [AWebRoute()]));

        Assert.Equal((0, before), (plan.Count, _host.State.Routes.Values.Single()));
    }

    [Fact]
    public async Task An_apply_records_itself_on_the_stack()
    {
        await _host.SendAsync(AnApply(routes: [AWebRoute()]) with { Commit = "4e1c9a2", PipelineUrl = "https://gitlab.example.com/shop/-/pipelines/1" });

        var apply = _host.State.Stacks["shop"].LastApply!;
        Assert.Equal(("shop-deploy", "4e1c9a2", 1), (apply.Token, apply.Commit, apply.Plan.Added.Count));
        Assert.NotNull(_host.State.PipelineTokens[_token.Id].LastUsedAt);
    }

    [Fact]
    public async Task The_audit_log_names_the_pipeline()
    {
        await _host.SendAsync(AnApply(routes: [AWebRoute()]));

        var entry = _host.State.Audit[^1];
        Assert.Equal(("stacks.apply", "shop-deploy", null, AuditOutcome.Succeeded), (entry.Action, entry.Pipeline, entry.User, entry.Outcome));
    }

    [Fact]
    public async Task A_dry_run_returns_the_plan_without_applying_it()
    {
        var plan = await _host.SendAsync(AnApply(routes: [AWebRoute()]) with { DryRun = true });

        Assert.Equal((1, 0, false), (plan.Added.Count, _host.State.Routes.Count, _host.State.Audit.Any(e => e.Action == "stacks.apply")));
    }

    [Fact]
    public async Task An_apply_won_t_take_over_a_hostname_outside_the_stack()
    {
        var project = _host.State.Projects.Values.Single();
        _host.Seed(new RouteSaved(ARoute(project.Id, host: "shop.example.com", path: "/legacy")));

        Assert.Equal(ErrorCodes.RouteHostInUse, await _host.FailureAsync(AnApply(routes: [AWebRoute()])));
    }

    [Fact]
    public async Task A_refused_apply_shows_on_the_stack_until_one_works()
    {
        _host.Seed(new RouteSaved(ARoute(_host.State.Projects.Values.Single().Id, host: "shop.example.com")));

        await _host.FailureAsync(AnApply(routes: [AWebRoute()]));

        var stack = _host.State.Stacks["shop"];
        Assert.Equal((ErrorCodes.RouteHostInUse, "shop-deploy", "shop.example.com"), (stack.Failure?.Code, stack.Failure?.Token, stack.Failure?.Detail));
        Assert.Equal(AuditOutcome.Failed, _host.State.Audit[^1].Outcome);
    }

    [Fact]
    public async Task A_successful_apply_clears_the_failure()
    {
        _host.Seed(new StackSaved(AStack() with { Failure = new StackFailure(DateTimeOffset.UnixEpoch, ErrorCodes.RouteHostInUse, "shop-deploy") }));

        await _host.SendAsync(AnApply(routes: [AWebRoute()]));

        Assert.Null(_host.State.Stacks["shop"].Failure);
    }

    [Fact]
    public async Task An_apply_that_would_remove_everything_is_refused()
    {
        await _host.SendAsync(AnApply(routes: [AWebRoute()]));

        Assert.Equal(ErrorCodes.StackRemovesEverything, await _host.FailureAsync(AnApply()));
        Assert.Single(_host.State.Routes.Values);
    }

    [Fact]
    public async Task Removing_everything_can_be_allowed()
    {
        await _host.SendAsync(AnApply(routes: [AWebRoute()]));

        await _host.SendAsync(AnApply() with { AllowRemovingAll = true });

        Assert.Empty(_host.State.Routes);
    }

    [Fact]
    public async Task A_label_that_replaces_a_change_made_here_says_who_made_it()
    {
        await _host.SendAsync(AnApply(routes: [AWebRoute()]));
        var route = _host.State.Routes.Values.Single();
        _host.Time.Advance(TimeSpan.FromMinutes(5));
        _host.Seed(new RouteSaved(route with { TimeoutSeconds = 90, ChangedAt = _host.Time.GetUtcNow(), ChangedBy = "marta@example.com" }));

        var plan = await _host.SendAsync(AnApply(routes: [AWebRoute() with { TimeoutSeconds = 30 }]));

        Assert.Equal(("timeout", "marta@example.com"), (Assert.Single(plan.Changed).Field, plan.Changed[0].ReplacedBy));
    }

    [Fact]
    public async Task A_project_named_in_the_labels_is_created_when_missing()
    {
        await _host.SendAsync(AnApply(routes: [AWebRoute() with { Project = "Storefront" }]));

        var project = Assert.Single(_host.State.Projects.Values, p => p.Name == "Storefront");
        Assert.Equal(project.Id, _host.State.Routes.Values.Single().ProjectId);
    }

    [Fact]
    public async Task An_apply_adds_stream_routes_and_redirects()
    {
        await _host.SendAsync(AnApply(
            streams: [new DeclaredStreamRoute("mqtt", "broker", StreamProtocol.Tcp, 8883, 1883)],
            redirects: [new DeclaredRedirect("www", "web", "www.shop.example.com", "https://shop.example.com")]));

        var stream = Assert.Single(_host.State.StreamRoutes.Values);
        Assert.Equal(("shop_broker", 1883, 8883), (stream.TargetHost, stream.TargetPort, stream.ListenPort));
        Assert.Equal(("www.shop.example.com", 308), (_host.State.Redirects.Values.Single().From, _host.State.Redirects.Values.Single().StatusCode));
    }

    [Fact]
    public async Task An_apply_redirects_a_path_beside_its_own_route()
    {
        await _host.SendAsync(AnApply(routes: [AWebRoute()], redirects: [AnOldPathRedirect()]));

        var redirect = _host.State.Redirects.Values.Single();
        Assert.Equal(("/old", "/new", true), (redirect.Path, redirect.To, redirect.Stack!.Fields.Contains("path")));
    }

    [Fact]
    public async Task An_apply_can_t_redirect_a_path_that_hides_its_own_route() =>
        Assert.Contains("Routes: stack.duplicate", await _host.ErrorsAsync(AnApply(routes: [AWebRoute() with { Path = "/old/api" }], redirects: [AnOldPathRedirect()])));

    [Fact]
    public async Task An_apply_names_a_path_redirect_by_its_hostname_and_path()
    {
        var plan = await _host.SendAsync(AnApply(redirects: [AnOldPathRedirect()]));

        Assert.Equal("shop.example.com/old", Assert.Single(plan.Added).Name);
    }

    [Fact]
    public async Task A_path_target_needs_a_redirected_path() =>
        Assert.Contains("Redirects[0].To: redirect.relativeNeedsPath", await _host.ErrorsAsync(AnApply(redirects: [AnOldPathRedirect() with { Path = null }])));

    [Fact]
    public async Task A_token_for_another_stack_can_t_apply_this_one()
    {
        _host.Seed(new StackSaved(AStack("blog")));

        await Assert.ThrowsAsync<AccessDeniedException>(() => _host.SendAsync(AnApply(routes: [AWebRoute()]) with { Stack = "blog" }));
    }

    [Fact]
    public async Task People_can_t_apply_a_stack_file()
    {
        _host.SignedIn(Role.Administrator);

        await Assert.ThrowsAsync<AccessDeniedException>(() => _host.SendAsync(AnApply(routes: [AWebRoute()])));
    }

    [Fact]
    public async Task A_pipeline_can_t_do_anything_else()
    {
        await Assert.ThrowsAsync<AccessDeniedException>(() => _host.QueryAsync(new ListStacks()));
    }

    [Fact]
    public async Task The_same_route_twice_in_a_file_is_refused() =>
        Assert.Contains("Routes: stack.duplicate", await _host.ErrorsAsync(AnApply(routes: [AWebRoute(), AWebRoute() with { Name = "other" }])));

    [Fact]
    public async Task A_pipeline_link_must_be_https() =>
        Assert.Contains("PipelineUrl: stack.pipelineUrlInvalid", await _host.ErrorsAsync(AnApply(routes: [AWebRoute()]) with { PipelineUrl = "javascript:alert(1)" }));

    private static DeclaredRoute AWebRoute() => new("web", "web", "shop.example.com", 8080);

    private static DeclaredRedirect AnOldPathRedirect() => new("old", "web", "shop.example.com", "/new", Path: "/old");

    private static ApplyStackFile AnApply(
        IReadOnlyList<DeclaredRoute>? routes = null,
        IReadOnlyList<DeclaredStreamRoute>? streams = null,
        IReadOnlyList<DeclaredRedirect>? redirects = null) =>
        new("shop", routes ?? [], streams ?? [], redirects ?? []);
}
