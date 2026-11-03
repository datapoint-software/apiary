using System.Text.Json;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Security.Tokens;

namespace Datapoint.Apiary.Management.Agents;

public sealed class AgentClients(SealedTokens tokens)
{
    public const int MaxNameLength = 80;
    public const int MaxRedirectUris = 10;
    public const string DefaultName = "MCP client";

    private const string Purpose = "apiary.agent-client";

    public string Register(string? name, IReadOnlyList<string>? redirectUris, IReadOnlyList<string> trustedOrigins)
    {
        if (redirectUris is not { Count: > 0 and <= MaxRedirectUris } || !redirectUris.All(uri => RedirectUris.IsAllowed(uri, trustedOrigins)))
        {
            throw ActionFailedException.Invalid(ErrorCodes.AgentRedirectInvalid);
        }

        var client = new AgentClient(CleanName(name), [.. redirectUris.Distinct(StringComparer.Ordinal)]);
        return tokens.Seal(Purpose, JsonSerializer.SerializeToUtf8Bytes(client, AgentsJsonContext.Default.AgentClient));
    }

    public AgentClient Read(string? clientId, string? redirectUri, IReadOnlyList<string> trustedOrigins)
    {
        var payload = string.IsNullOrEmpty(clientId) ? null : tokens.Open(Purpose, clientId);
        var client = payload is null ? null : JsonSerializer.Deserialize(payload, AgentsJsonContext.Default.AgentClient);
        if (client is null)
        {
            throw ActionFailedException.Invalid(ErrorCodes.AgentClientUnknown);
        }

        if (redirectUri is null || !client.RedirectUris.Contains(redirectUri, StringComparer.Ordinal))
        {
            throw ActionFailedException.Invalid(ErrorCodes.AgentRedirectUnknown);
        }

        if (!RedirectUris.IsAllowed(redirectUri, trustedOrigins))
        {
            throw ActionFailedException.Invalid(ErrorCodes.AgentRedirectInvalid);
        }

        return client;
    }

    private static string CleanName(string? name)
    {
        var printable = new string([.. (name ?? string.Empty).Where(c => !char.IsControl(c))]).Trim();
        return printable.Length == 0 ? DefaultName : printable[..Math.Min(printable.Length, MaxNameLength)];
    }
}
