using Datapoint.Apiary.Management.Authorization;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator.Authorization;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace Datapoint.Apiary.Management;

public static class ManagementServiceCollectionExtensions
{
    public static IServiceCollection AddApiaryManagement(this IServiceCollection services)
    {
        services.AddScoped<StateTransaction>();
        services.AddScoped(typeof(IAuthorizer<>), typeof(RoleAuthorizer<>));
        services.AddValidatorsFromAssemblyContaining<StateTransaction>(ServiceLifetime.Scoped, includeInternalTypes: false);
        return services;
    }
}
