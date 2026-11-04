using System.Collections.Concurrent;
using Datapoint.Apiary.Management.SingleSignOn;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;

namespace Datapoint.Apiary.SingleSignOn;

public sealed class SsoProviders(IHttpClientFactory clients, SsoIssuerPolicy policy, TimeProvider time)
{
    public const string ClientName = "apiary.sso";

    private static readonly TimeSpan s_refreshInterval = TimeSpan.FromMinutes(5);

    private readonly ConcurrentDictionary<string, ConfigurationManager<OpenIdConnectConfiguration>> _managers = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<string, DateTimeOffset> _refreshed = new(StringComparer.Ordinal);

    public Task<OpenIdConnectConfiguration> DiscoverAsync(string issuer, CancellationToken ct) =>
        _managers.GetOrAdd(issuer, Create).GetConfigurationAsync(ct);

    public bool Refresh(string issuer)
    {
        var now = time.GetUtcNow();
        var last = _refreshed.GetOrAdd(issuer, DateTimeOffset.MinValue);
        if (now - last < s_refreshInterval || !_refreshed.TryUpdate(issuer, now, last))
        {
            return false;
        }

        _managers[issuer] = Create(issuer);
        return true;
    }

    public HttpClient Client() => clients.CreateClient(ClientName);

    private ConfigurationManager<OpenIdConnectConfiguration> Create(string issuer) => new(
        issuer + "/.well-known/openid-configuration",
        new OpenIdConnectConfigurationRetriever(),
        new HttpDocumentRetriever(Client()) { RequireHttps = !policy.AllowHttp })
    {
        AutomaticRefreshInterval = TimeSpan.FromHours(12),
        RefreshInterval = s_refreshInterval,
    };
}
