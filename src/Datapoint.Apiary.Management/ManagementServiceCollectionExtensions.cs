using Datapoint.Apiary.Management.Activity;
using Datapoint.Apiary.Management.Account;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Agents;
using Datapoint.Apiary.Management.Audit;
using Datapoint.Apiary.Management.Backups;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Apiary.Management.Setup;
using Datapoint.Apiary.Management.SingleSignOn;
using Datapoint.Apiary.Management.Streams;
using Datapoint.Apiary.Management.Routes;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Apiary.Management.Users;
using Datapoint.Apiary.Security.Keys;
using Datapoint.Apiary.Security.Tokens;
using Datapoint.Mediator.Authorization;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Datapoint.Apiary.Management;

public static class ManagementServiceCollectionExtensions
{
    public static IServiceCollection AddApiaryManagement(this IServiceCollection services)
    {
        services.TryAddSingleton<IRouteTelemetry, NoRouteTelemetry>();
        services.TryAddSingleton<IActivityTelemetry, NoActivityTelemetry>();
        services.AddScoped<StateTransaction>();
        services.AddScoped<ForwardedRequest>();
        services.AddScoped<CurrentUser>();
        services.AddScoped<Sessions>();
        services.AddScoped<PasswordConfirmation>();
        services.AddScoped<Invitations>();
        services.AddScoped<AuditLog>();
        services.AddScoped<BackupRestorer>();
        services.AddSingleton<Challenges>();
        services.AddSingleton<AgentClients>();
        services.AddSingleton<AgentGrants>();
        services.AddSingleton<SsoAssertions>();
        services.TryAddSingleton(new SsoIssuerPolicy(AllowHttp: false));
        services.TryAddSingleton(new StreamPortPolicy(new HashSet<int>()));
        services.AddSingleton<SignInThrottle>();
        services.AddSingleton<SetupWindow>();
        services.AddSingleton(provider => new SealingKey(provider.GetRequiredService<RootKey>().Derive(KeyPurposes.Challenges)));
        services.AddSingleton<SealedTokens>();
        services.AddScoped(typeof(IAuthorizer<>), typeof(RoleAuthorizer<>));
        services.AddValidatorsFromAssemblyContaining<StateTransaction>(ServiceLifetime.Scoped, includeInternalTypes: false);
        return services;
    }
}
