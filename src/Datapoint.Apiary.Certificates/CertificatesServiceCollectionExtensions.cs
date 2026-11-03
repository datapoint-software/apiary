using Datapoint.Apiary.Certificates.Acme;
using Datapoint.Apiary.Certificates.Challenges;
using Datapoint.Apiary.Certificates.Renewal;
using Datapoint.Apiary.Certificates.Selection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Datapoint.Apiary.Certificates;

public static class CertificatesServiceCollectionExtensions
{
    private static readonly TimeSpan s_acmeTimeout = TimeSpan.FromSeconds(30);

    public static IServiceCollection AddApiaryCertificates(this IServiceCollection services, IConfiguration acme)
    {
        services.Configure<AcmeOptions>(acme);
        services.AddSingleton<IAcmeClient>(provider =>
        {
            var http = new HttpClient(new SocketsHttpHandler { PooledConnectionLifetime = TimeSpan.FromMinutes(5) }) { Timeout = s_acmeTimeout };
            http.DefaultRequestHeaders.UserAgent.ParseAdd("Apiary");
            return new AcmeClient(http, provider.GetRequiredService<TimeProvider>());
        });
        services.AddSingleton<CertificateSelector>();
        services.AddSingleton<CertificateIssuer>();
        services.AddSingleton<AcmeChallengeResponder>();
        services.AddHostedService<CertificateRenewal>();
        return services;
    }
}
