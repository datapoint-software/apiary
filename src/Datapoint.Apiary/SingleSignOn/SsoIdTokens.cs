using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Datapoint.Apiary.Cluster.SingleSignOn;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace Datapoint.Apiary.SingleSignOn;

public static class SsoIdTokens
{
    private static readonly string[] s_algorithms =
    [
        SecurityAlgorithms.RsaSha256, SecurityAlgorithms.RsaSha384, SecurityAlgorithms.RsaSha512,
        SecurityAlgorithms.RsaSsaPssSha256, SecurityAlgorithms.RsaSsaPssSha384, SecurityAlgorithms.RsaSsaPssSha512,
        SecurityAlgorithms.EcdsaSha256, SecurityAlgorithms.EcdsaSha384, SecurityAlgorithms.EcdsaSha512,
    ];

    private static readonly JsonWebTokenHandler s_handler = new() { MapInboundClaims = false };

    public static Task<TokenValidationResult> ValidateAsync(string idToken, OpenIdConnectConfiguration configuration, SsoSettings settings) =>
        s_handler.ValidateTokenAsync(idToken, new TokenValidationParameters
        {
            ValidIssuer = configuration.Issuer,
            ValidAudience = settings.ClientId,
            IssuerSigningKeys = configuration.SigningKeys,
            ValidAlgorithms = s_algorithms,
            RequireSignedTokens = true,
            RequireExpirationTime = true,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(2),
        });

    public static bool IsKeyUnknown(TokenValidationResult result) => result.Exception is SecurityTokenSignatureKeyNotFoundException;

    public static bool IsFor(JsonWebToken token, SsoSettings settings, SsoFlow flow) =>
        !string.IsNullOrEmpty(token.Subject) && Matches(token, "nonce", flow.Nonce) && IsAuthorizedParty(token, settings.ClientId);

    public static SsoClaims? Read(JsonWebToken token, string groupsClaim)
    {
        var email = Text(token, "email");
        if (email is null || IsUnverified(token))
        {
            return null;
        }

        var name = Text(token, "name") ?? Text(token, "preferred_username") ?? email;
        return new SsoClaims(token.Subject, email, name, Groups(token, groupsClaim));
    }

    private static bool IsAuthorizedParty(JsonWebToken token, string clientId) =>
        Text(token, "azp") is { } party ? party == clientId : token.Audiences.Count() == 1;

    private static bool Matches(JsonWebToken token, string claim, string expected) =>
        Text(token, claim) is { } actual
        && CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(actual), Encoding.UTF8.GetBytes(expected));

    private static bool IsUnverified(JsonWebToken token) =>
        (token.TryGetPayloadValue<bool>("email_verified", out var verified) && !verified)
        || string.Equals(Text(token, "email_verified"), "false", StringComparison.OrdinalIgnoreCase);

    private static string? Text(JsonWebToken token, string claim) =>
        token.TryGetPayloadValue<string>(claim, out var value) && !string.IsNullOrWhiteSpace(value) ? value : null;

    private static IReadOnlyList<string> Groups(JsonWebToken token, string claim)
    {
        if (!token.TryGetPayloadValue<JsonElement>(claim, out var element))
        {
            return Text(token, claim) is { } single ? [single] : [];
        }

        return element.ValueKind switch
        {
            JsonValueKind.Array => [.. element.EnumerateArray().Where(e => e.ValueKind == JsonValueKind.String).Select(e => e.GetString()!)],
            JsonValueKind.String => [element.GetString()!],
            _ => [],
        };
    }
}
