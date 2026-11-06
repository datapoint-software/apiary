using Datapoint.Apiary.Accounts;
using Datapoint.Apiary.Agents;
using Datapoint.Apiary.Api;
using Datapoint.Apiary.Auth;
using Datapoint.Apiary.Certificates;
using Datapoint.Apiary.Cluster;
using Datapoint.Apiary.Keys;
using Datapoint.Apiary.Management;
using Datapoint.Apiary.Management.Activity;
using Datapoint.Apiary.Management.Audit;
using Datapoint.Apiary.Management.Routes;
using Datapoint.Apiary.Management.SingleSignOn;
using Datapoint.Apiary.Management.Streams;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Apiary.Proxy;
using Datapoint.Apiary.Replication;
using Datapoint.Apiary.SingleSignOn;
using Datapoint.Apiary.Telemetry;
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
        services.AddApiaryCertificates(section.GetSection("Acme"), section.GetSection("Dns"));
        services.AddHostedService<StartupTasks>();
        services.AddSingleton<AdminCertificates>();
        services.AddHostedService<AdminCertificateKeeper>();
        services.AddSingleton<IRouteTelemetry, ClusterRouteTelemetry>();
        services.AddSingleton<IActivityTelemetry, ClusterActivityTelemetry>();
        var options = section.Get<ApiaryOptions>() ?? new ApiaryOptions();
        services.AddSingleton(new SsoIssuerPolicy(options.AllowHttpSsoIssuer));
        services.AddSingleton(new StreamPortPolicy(options.OwnPorts));
        services.AddApiaryManagement();
        services.AddApiarySso();
        services.AddBreachedPasswords(options.CheckBreachedPasswords);
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
        services.AddApiaryMcp();

        services.AddApiaryProxy(
            options.OwnPorts,
            options.InternalPorts,
            new HashSet<string>(StringComparer.Ordinal) { SessionCookie.Name, SessionActivity.CookieName, SsoFlowCookie.Name },
            section.GetSection("AccessLogs"),
            section.GetSection("VisitorPages"));
        services.AddApiaryTelemetry(section.GetSection("Telemetry"));
        return services;
    }

    public static ApiaryOptions ApiaryOptions(this IServiceProvider services) =>
        services.GetRequiredService<IOptions<ApiaryOptions>>().Value;
}
