using Datapoint.Apiary.Api;
using Datapoint.Apiary.Auth;
using Datapoint.Apiary.Certificates;
using Datapoint.Apiary.Cluster;
using Datapoint.Apiary.Keys;
using Datapoint.Apiary.Management;
using Datapoint.Apiary.Management.Audit;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Apiary.Proxy;
using Datapoint.Apiary.Replication;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;

namespace Datapoint.Apiary.Hosting;

public static class ApiaryServices
{
    public static IServiceCollection AddApiary(this IServiceCollection services, IConfiguration configuration)
    {
        var section = configuration.GetSection("Apiary");
        services.Configure<ApiaryOptions>(section);
        services.AddSingleton(TimeProvider.System);
        services.AddHttpContextAccessor();
        services.AddProblemDetails(o => o.CustomizeProblemDetails = ProblemDetailsCodes.Apply);
        services.TryAddEnumerable(ServiceDescriptor.Singleton<MatcherPolicy, ListenerMatcherPolicy>());
        services.AddOpenApi();
        services.ConfigureHttpJsonOptions(o => o.SerializerOptions.PropertyNamingPolicy = ApiJson.Options.PropertyNamingPolicy);

        services.AddSingleton<RootKeyLoader>();
        services.AddSingleton(provider => provider.GetRequiredService<RootKeyLoader>().Load());
        services.AddApiaryCluster(section);
        services.AddApiaryCertificates(section.GetSection("Acme"));
        services.AddHostedService<StartupTasks>();
        services.AddApiaryManagement();
        services.AddScoped<IRequestOrigin, HttpRequestOrigin>();
        services.AddScoped<ICommandForwarder, CommandForwarder>();
        services.AddHttpPrincipalAccessor();
        services.AddApiaryAuthentication();
        services.AddAuthorizationObserver<AuthorizationAuditor>();
        services.AddMediator(o => o
            .AddHandlersFromAssemblyContaining<StateTransaction>()
            .AddAuthorizationBehavior()
            .AddValidationBehavior()
            .AddBehavior<StateTransactionBehavior>());

        var options = section.Get<ApiaryOptions>() ?? new ApiaryOptions();
        services.AddApiaryProxy(options.OwnPorts);
        return services;
    }

    public static ApiaryOptions ApiaryOptions(this IServiceProvider services) =>
        services.GetRequiredService<IOptions<ApiaryOptions>>().Value;
}
