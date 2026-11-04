using System.Security.Claims;
using Datapoint.Apiary.Cluster.Backups;
using Datapoint.Apiary.Cluster.Projects;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Cluster.Telemetry;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Routes;
using Datapoint.Apiary.Management.Streams;
using Datapoint.Apiary.Management.Tests.Fakes;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Apiary.Security.Keys;
using Datapoint.Apiary.Security.Passwords;
using Datapoint.Apiary.Testing;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Time.Testing;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Management.Tests;

public sealed class ManagementHost : IDisposable
{
    public const string Password = "correct horse battery staple";

    private readonly ServiceProvider _services;

    public ManagementHost(IReadOnlySet<int>? reservedPorts = null)
    {
        var services = new ServiceCollection();
        services.AddSingleton<TimeProvider>(Time);
        services.AddSingleton<IClusterState>(Cluster);
        services.AddSingleton(RootKey);
        services.AddSingleton<BackupSealer>();
        services.AddSingleton<IPrincipalAccessor>(Principal);
        services.AddSingleton<ISessionCookie>(Cookie);
        services.AddSingleton<IBreachedPasswords>(Breached);
        services.AddSingleton<ICommandForwarder>(Forwarder);
        services.AddSingleton<IRouteTelemetry>(Telemetry);
        services.AddSingleton<IRequestOrigin, TestOrigin>();
        services.AddLogging();
        services.AddMetrics();
        services.AddSingleton<ClusterMetrics>();
        services.AddSingleton(new StreamPortPolicy(reservedPorts ?? new HashSet<int>()));
        services.AddApiaryManagement();
        services.AddMediator(o => o
            .AddHandlersFromAssemblyContaining<StateTransaction>()
            .AddAuthorizationBehavior()
            .AddValidationBehavior()
            .AddBehavior<StateTransactionBehavior>());
        _services = services.BuildServiceProvider(new ServiceProviderOptions { ValidateScopes = true });
    }

    public FakeTimeProvider Time { get; } = TestClock.Fake();

    public FakeClusterState Cluster { get; } = new();

    public RootKey RootKey { get; } = RootKey.Generate();

    public TestPrincipal Principal { get; } = new();

    public RecordingSessionCookie Cookie { get; } = new();

    public FakeBreachedPasswords Breached { get; } = new();

    public NoForwarding Forwarder { get; } = new();

    public FakeRouteTelemetry Telemetry { get; } = new();

    public ApiaryState State => Cluster.Current;

    public void Seed(params IStateChange[] changes) => Cluster.Current = Cluster.Current.With(changes);

    public Project AProjectIn()
    {
        var project = AProject();
        Seed(new ProjectSaved(project));
        return project;
    }

    public User AUserIn(Role role = Role.Administrator, string email = "ana@example.com")
    {
        var user = AUser(email, role) with { PasswordHash = PasswordHasher.Hash(Password) };
        Seed(new UserSaved(user));
        return user;
    }

    public User SignedIn(Role role = Role.Administrator, string email = "ana@example.com")
    {
        var user = AUserIn(role, email);
        SignIn(user);
        return user;
    }

    public void SignIn(User user, Guid? sessionId = null) =>
        Principal.Principal = new ClaimsPrincipal(new ClaimsIdentity(
            [
                new Claim(ApiaryClaims.UserId, user.Id.ToString()),
                new Claim(ApiaryClaims.Email, user.Email),
                new Claim(ApiaryClaims.Role, user.Role.ToString()),
                new Claim(ApiaryClaims.SessionId, (sessionId ?? Guid.Empty).ToString()),
            ],
            "Test"));

    public void SignOut() => Principal.Principal = null;

    public async Task<TResult> SendAsync<TResult>(ICommand<TResult> command)
    {
        await using var scope = _services.CreateAsyncScope();
        return await scope.ServiceProvider.GetRequiredService<IMediator>().SendAsync(command, TestContext.Current.CancellationToken);
    }

    public async Task SendAsync(ICommand command)
    {
        await using var scope = _services.CreateAsyncScope();
        await scope.ServiceProvider.GetRequiredService<IMediator>().SendAsync(command, TestContext.Current.CancellationToken);
    }

    public async Task<TResult> QueryAsync<TResult>(IQuery<TResult> query)
    {
        await using var scope = _services.CreateAsyncScope();
        return await scope.ServiceProvider.GetRequiredService<IMediator>().QueryAsync(query, TestContext.Current.CancellationToken);
    }

    public async Task<IReadOnlyList<string>> ErrorsAsync<TResult>(ICommand<TResult> command)
    {
        try
        {
            await SendAsync(command);
            return [];
        }
        catch (ValidationException exception)
        {
            return [.. exception.Errors.Select(e => $"{e.PropertyName}: {e.ErrorCode}")];
        }
    }

    public async Task<IReadOnlyList<string>> ErrorsAsync(ICommand command)
    {
        try
        {
            await SendAsync(command);
            return [];
        }
        catch (ValidationException exception)
        {
            return [.. exception.Errors.Select(e => $"{e.PropertyName}: {e.ErrorCode}")];
        }
    }

    public async Task<string> FailureAsync<TResult>(ICommand<TResult> command) =>
        (await Assert.ThrowsAsync<ActionFailedException>(() => SendAsync(command))).Code;

    public async Task<string> FailureAsync(ICommand command) =>
        (await Assert.ThrowsAsync<ActionFailedException>(() => SendAsync(command))).Code;

    public T Get<T>()
        where T : notnull => _services.GetRequiredService<T>();

    public void Dispose()
    {
        _services.Dispose();
        Cluster.Dispose();
    }
}
