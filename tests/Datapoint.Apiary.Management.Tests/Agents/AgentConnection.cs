using System.Security.Cryptography;
using System.Text;
using Datapoint.Apiary.Cluster.Agents;
using Datapoint.Apiary.Management.Agents;
using Datapoint.Apiary.Security.Tokens;

namespace Datapoint.Apiary.Management.Tests.Agents;

public sealed class AgentConnection(ManagementHost host, string redirectUri = AgentConnection.LocalCallback, string name = "Claude")
{
    public const string LocalCallback = "http://127.0.0.1:33418/callback";

    public string ClientId { get; } = host.Get<AgentClients>().Register(name, [redirectUri], AgentPolicy.TrustedOriginsOf(host.State));

    public string RedirectUri { get; } = redirectUri;

    public string Verifier { get; } = Base64Url.Encode(RandomNumberGenerator.GetBytes(32));

    public string Challenge => Base64Url.Encode(SHA256.HashData(Encoding.ASCII.GetBytes(Verifier)));

    public ConnectAgent Approval(string? state = null) => new(ClientId, RedirectUri, Challenge, "S256", state);

    public async Task<string> CodeAsync()
    {
        var connected = await host.SendAsync(Approval("xyz"));
        return Query(connected.RedirectTo)["code"];
    }

    public IssueAgentToken Exchange(string code, string? verifier = null) =>
        new("authorization_code", ClientId, code, verifier ?? Verifier, RedirectUri);

    public IssueAgentToken Refresh(string refreshToken) => new("refresh_token", ClientId, RefreshToken: refreshToken);

    public async Task<AgentTokenResult> TokensAsync() => await host.SendAsync(Exchange(await CodeAsync()));

    public static IReadOnlyDictionary<string, string> Query(string uri) =>
        new Uri(uri).Query.TrimStart('?').Split('&')
            .Select(p => p.Split('=', 2))
            .ToDictionary(p => p[0], p => Uri.UnescapeDataString(p[1]), StringComparer.Ordinal);
}
