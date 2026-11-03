using System.Collections.Concurrent;
using Datapoint.Apiary.Management.SingleSignOn;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;

namespace Datapoint.Apiary.SingleSignOn;

public sealed class SsoProviders(IHttpClientFactory clients, SsoIssuerPolicy policy)
{
    public const string ClientName = "apiary.sso";

    private readonly ConcurrentDictionary<string, ConfigurationManager<OpenIdConnectConfiguration>> _managers = new(StringComparer.Ordinal);

    public Task<OpenIdConnectConfiguration> DiscoverAsync(string issuer, CancellationToken ct) =>
        _managers.GetOrAdd(issuer, Create).GetConfigurationAsync(ct);

    public HttpClient Client() => clients.CreateClient(ClientName);

    private ConfigurationManager<OpenIdConnectConfiguration> Create(string issuer) => new(
        issuer + "/.well-known/openid-configuration",
        new OpenIdConnectConfigurationRetriever(),
        new HttpDocumentRetriever(Client()) { RequireHttps = !policy.AllowHttp })
    {
        AutomaticRefreshInterval = TimeSpan.FromHours(12),
        RefreshInterval = TimeSpan.FromMinutes(5),
    };
}
