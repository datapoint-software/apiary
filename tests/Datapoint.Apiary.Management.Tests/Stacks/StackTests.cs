using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.Stacks;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Stacks;
using Datapoint.Apiary.Security.Tokens;
using Datapoint.Mediator.Authorization;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Management.Tests.Stacks;

public sealed class StackTests : IDisposable
{
    private readonly ManagementHost _host = new();

    public StackTests()
    {
        _host.SignedIn(Role.Administrator);
        _host.AProjectIn();
    }

    public void Dispose() => _host.Dispose();

    [Fact]
    public async Task An_administrator_adds_a_stack_with_its_first_token()
    {
        var created = await _host.SendAsync(new AddStackWithToken("blog", "blog-deploy"));

        var token = _host.State.PipelineTokens[created.Id];
        Assert.StartsWith(PipelineTokens.Prefix, created.Token, StringComparison.Ordinal);
        Assert.Equal(("blog", SecretTokens.Hash(created.Token)), (token.Stack, token.Hash));
        Assert.True(_host.State.Stacks.ContainsKey("blog"));
    }

    [Theory]
    [InlineData("Shop")]
    [InlineData("_shop")]
    [InlineData("shop.web")]
    public async Task A_stack_name_is_written_as_Docker_writes_it(string name) =>
        Assert.Contains("Name: stack.nameInvalid", await _host.ErrorsAsync(new AddStackWithToken(name, "deploy")));

    [Fact]
    public async Task A_stack_is_added_once()
    {
        _host.Seed(new StackSaved(AStack()));

        Assert.Contains("Name: stack.exists", await _host.ErrorsAsync(new AddStackWithToken("shop", "shop-deploy-2")));
    }

    [Fact]
    public async Task Token_names_are_unique()
    {
        _host.Seed(new StackSaved(AStack()), new PipelineTokenSaved(APipelineToken()));

        Assert.Contains("Name: pipelineToken.nameTaken", await _host.ErrorsAsync(new CreatePipelineToken("shop", "SHOP-deploy")));
    }

    [Fact]
    public async Task Operators_can_t_create_tokens()
    {
        _host.Seed(new StackSaved(AStack()));
        _host.SignedIn(Role.Operator, "rui@example.com");

        await Assert.ThrowsAsync<AccessDeniedException>(() => _host.SendAsync(new CreatePipelineToken("shop", "shop-deploy")));
    }

    [Fact]
    public async Task A_revoked_token_is_gone()
    {
        var token = APipelineToken();
        _host.Seed(new StackSaved(AStack()), new PipelineTokenSaved(token));

        await _host.SendAsync(new RevokePipelineToken(token.Id));

        Assert.Empty(_host.State.PipelineTokens);
    }

    [Fact]
    public async Task Removing_a_stack_deletes_what_it_declared_and_its_tokens()
    {
        var project = _host.State.Projects.Values.Single();
        var declared = ARoute(project.Id) with { Stack = new StackSource("shop", "web", "web", ["host"]) };
        var other = ARoute(project.Id, host: "blog.example.com");
        _host.Seed(new StackSaved(AStack()), new PipelineTokenSaved(APipelineToken()), new RouteSaved(declared), new RouteSaved(other));

        await _host.SendAsync(new RemoveStackAndRoutes("shop"));

        Assert.Equal([other.Id], _host.State.Routes.Keys);
        Assert.Empty(_host.State.PipelineTokens);
        Assert.Empty(_host.State.Stacks);
    }

    [Fact]
    public async Task Removing_an_unknown_stack_fails() =>
        Assert.Equal(ErrorCodes.StackNotFound, await _host.FailureAsync(new RemoveStackAndRoutes("blog")));

    [Fact]
    public async Task A_stack_lists_what_it_declares_and_its_tokens()
    {
        var project = _host.State.Projects.Values.Single();
        _host.Seed(
            new StackSaved(AStack()),
            new PipelineTokenSaved(APipelineToken()),
            new RouteSaved(ARoute(project.Id, path: "/api") with { Stack = new StackSource("shop", "api", "api", ["host"]) }));

        var details = await _host.QueryAsync(new GetStackDetails("shop"));

        Assert.Equal(("shop.example.com/api", "api", 1), (details.Items.Single().Name, details.Items.Single().Service, details.Stack.Routes));
        Assert.Equal("shop-deploy", details.Tokens.Single().Name);
    }
}
