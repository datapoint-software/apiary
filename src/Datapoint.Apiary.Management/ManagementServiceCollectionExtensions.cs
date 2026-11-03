using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Audit;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Apiary.Management.Setup;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Apiary.Management.Users;
using Datapoint.Apiary.Security.Keys;
using Datapoint.Apiary.Security.Tokens;
using Datapoint.Mediator.Authorization;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace Datapoint.Apiary.Management;

public static class ManagementServiceCollectionExtensions
{
    public static IServiceCollection AddApiaryManagement(this IServiceCollection services)
    {
        services.AddScoped<StateTransaction>();
        services.AddScoped<CurrentUser>();
        services.AddScoped<Sessions>();
        services.AddScoped<Invitations>();
        services.AddScoped<AuditLog>();
        services.AddSingleton<Challenges>();
        services.AddSingleton<SignInThrottle>();
        services.AddSingleton<SetupWindow>();
        services.AddSingleton(provider => new SealingKey(provider.GetRequiredService<RootKey>().Derive(KeyPurposes.Challenges)));
        services.AddSingleton<SealedTokens>();
        services.AddScoped(typeof(IAuthorizer<>), typeof(RoleAuthorizer<>));
        services.AddValidatorsFromAssemblyContaining<StateTransaction>(ServiceLifetime.Scoped, includeInternalTypes: false);
        return services;
    }
}
