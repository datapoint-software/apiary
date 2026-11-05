using Datapoint.Apiary.Cluster.Redirects;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.Stacks;
using Datapoint.Apiary.Cluster.Streams;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Redirects;
using Datapoint.Apiary.Management.Routes;
using Datapoint.Apiary.Management.Streams;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Management.Tests.Stacks;

public sealed class StackLockTests : IDisposable
{
    private readonly ManagementHost _host = new();
    private readonly Route _route;

    public StackLockTests()
    {
        _host.SignedIn(Role.Operator);
        var project = _host.AProjectIn();
        _route = ARoute(project.Id) with { Stack = new StackSource("shop", "web", "web", ["host", "path", "targets", "timeout"]) };
        _host.Seed(new StackSaved(AStack()), new RouteSaved(_route));
    }

    public void Dispose() => _host.Dispose();

    [Fact]
    public async Task A_field_set_by_a_label_can_t_change_here() =>
        Assert.Equal(["TimeoutSeconds: route.declaredInStack"], await _host.ErrorsAsync(AnUpdate() with { TimeoutSeconds = 90 }));

    [Fact]
    public async Task A_field_the_labels_leave_out_can_change() =>
        Assert.Empty(await _host.ErrorsAsync(AnUpdate() with { RateLimit = 600 }));

    [Fact]
    public async Task A_stack_s_route_can_still_be_disabled()
    {
        await _host.SendAsync(new DisableRoute(_route.Id));

        Assert.True(_host.State.Routes[_route.Id].Disabled);
    }

    [Fact]
    public async Task A_stack_s_route_can_t_be_deleted_here() =>
        Assert.Equal(ErrorCodes.RouteDeclaredInStack, await _host.FailureAsync(new DeleteRoute(_route.Id)));

    [Fact]
    public async Task A_stack_s_redirect_can_t_be_deleted_here()
    {
        var redirect = ARedirect(_route.ProjectId) with { Stack = new StackSource("shop", "web", "www", ["from", "to"]) };
        _host.Seed(new RedirectSaved(redirect));

        Assert.Equal(ErrorCodes.RedirectDeclaredInStack, await _host.FailureAsync(new DeleteRedirect(redirect.Id)));
    }

    [Fact]
    public async Task A_stack_s_stream_route_keeps_its_port()
    {
        var stream = AStream(_route.ProjectId) with { Stack = new StackSource("shop", "db", "db", ["name", "protocol", "listen", "target", "port"]) };
        _host.Seed(new StreamRouteSaved(stream));

        var errors = await _host.ErrorsAsync(new UpdateStreamRoute(stream.Id, stream.ProjectId, stream.Name, stream.Protocol, 5433, stream.TargetHost, stream.TargetPort));

        Assert.Contains("ListenPort: stream.declaredInStack", errors);
    }

    private UpdateRoute AnUpdate() => new(_route.Id, _route.ProjectId, _route.Host, _route.Path, _route.Targets, _route.TimeoutSeconds);
}
