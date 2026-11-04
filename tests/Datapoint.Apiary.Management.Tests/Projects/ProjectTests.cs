using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Cluster.Redirects;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.Streams;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Projects;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Management.Tests.Projects;

public sealed class ProjectTests : IDisposable
{
    private readonly ManagementHost _host = new();

    public ProjectTests() => _host.SignedIn(Role.Operator);

    public void Dispose() => _host.Dispose();

    [Fact]
    public async Task An_operator_creates_a_project()
    {
        var id = await _host.SendAsync(new CreateProject(" Shop ", " The online shop "));

        Assert.Equal(("Shop", "The online shop"), (_host.State.Projects[id].Name, _host.State.Projects[id].Description));
    }

    [Fact]
    public async Task A_project_needs_a_name() =>
        Assert.Contains("Name: required", await _host.ErrorsAsync(new CreateProject(" ")));

    [Fact]
    public async Task A_project_name_has_at_most_40_characters() =>
        Assert.Contains("Name: tooLong", await _host.ErrorsAsync(new CreateProject(new string('a', 41))));

    [Fact]
    public async Task Two_projects_can_t_share_a_name_in_any_case()
    {
        _host.AProjectIn();

        Assert.Contains("Name: project.nameTaken", await _host.ErrorsAsync(new CreateProject("SHOP")));
    }

    [Fact]
    public async Task A_project_keeps_its_own_name_when_updated()
    {
        var project = _host.AProjectIn();

        Assert.Empty(await _host.ErrorsAsync(new UpdateProject(project.Id, "Shop", "New description")));
    }

    [Fact]
    public async Task An_unknown_icon_is_refused() =>
        Assert.Contains("Icon: project.iconUnknown", await _host.ErrorsAsync(new CreateProject("Shop", Icon: "unicorn")));

    [Fact]
    public async Task Updating_a_project_that_doesn_t_exist_fails() =>
        Assert.Equal(ErrorCodes.ProjectNotFound, await _host.FailureAsync(new UpdateProject(AnId(), "Shop")));

    [Fact]
    public async Task An_empty_project_is_deleted()
    {
        _host.AProjectIn();
        var empty = await _host.SendAsync(new CreateProject("Blog"));

        await _host.SendAsync(new DeleteProject(empty));

        Assert.DoesNotContain(empty, _host.State.Projects.Keys);
    }

    [Fact]
    public async Task The_last_project_can_t_be_deleted()
    {
        var project = _host.AProjectIn();

        Assert.Equal(ErrorCodes.ProjectLast, await _host.FailureAsync(new DeleteProject(project.Id)));
    }

    [Fact]
    public async Task A_project_with_routes_needs_somewhere_to_move_them()
    {
        var project = _host.AProjectIn();
        _host.AProjectIn();
        _host.Seed(new RouteSaved(ARoute(project.Id)));

        Assert.Equal(ErrorCodes.ProjectNotEmpty, await _host.FailureAsync(new DeleteProject(project.Id)));
    }

    [Fact]
    public async Task Deleting_a_project_moves_everything_in_it()
    {
        var project = _host.AProjectIn();
        var other = _host.AProjectIn();
        _host.Seed(
            new RouteSaved(ARoute(project.Id)),
            new RedirectSaved(ARedirect(project.Id)),
            new StreamRouteSaved(AStream(project.Id)),
            new CertificateSaved(ACertificate() with { ProjectId = project.Id }));

        await _host.SendAsync(new DeleteProject(project.Id, other.Id));

        Assert.Equal(
            (other.Id, other.Id, other.Id, (Guid?)other.Id),
            (_host.State.Routes.Values.Single().ProjectId, _host.State.Redirects.Values.Single().ProjectId, _host.State.StreamRoutes.Values.Single().ProjectId, _host.State.Certificates.Values.Single().ProjectId));
    }

    [Fact]
    public async Task A_project_can_t_move_its_routes_to_itself()
    {
        var project = _host.AProjectIn();
        _host.AProjectIn();
        _host.Seed(new RouteSaved(ARoute(project.Id)));

        Assert.Equal(ErrorCodes.ProjectMoveToSelf, await _host.FailureAsync(new DeleteProject(project.Id, project.Id)));
    }

    [Fact]
    public async Task A_project_can_t_move_its_routes_to_an_unknown_project()
    {
        var project = _host.AProjectIn();
        _host.AProjectIn();
        _host.Seed(new RouteSaved(ARoute(project.Id)));

        Assert.Equal(ErrorCodes.ProjectNotFound, await _host.FailureAsync(new DeleteProject(project.Id, AnId())));
    }

    [Fact]
    public async Task Projects_are_listed_by_name_with_their_counts()
    {
        var shop = _host.AProjectIn();
        var blog = await _host.SendAsync(new CreateProject("blog"));
        _host.Seed(new RouteSaved(ARoute(shop.Id)), new RouteSaved(ARoute(shop.Id, path: "/api")), new RedirectSaved(ARedirect(shop.Id)));

        var projects = await _host.QueryAsync(new ListProjects());

        Assert.Equal([(blog, 0, 0), (shop.Id, 2, 1)], projects.Select(p => (p.Id, p.RouteCount, p.RedirectCount)));
    }

    [Fact]
    public async Task Checking_a_taken_name_warns()
    {
        _host.AProjectIn();

        var checks = await _host.QueryAsync(new CheckProject("shop"));

        Assert.Equal("project.nameTaken", checks.Single().Code);
    }
}
