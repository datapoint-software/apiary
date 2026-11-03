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

    public static async Task<SsoClaims?> ValidateAsync(string idToken, OpenIdConnectConfiguration configuration, SsoSettings settings, SsoFlow flow)
    {
        var result = await s_handler.ValidateTokenAsync(idToken, new TokenValidationParameters
        {
            ValidIssuer = settings.Issuer,
            ValidIssuers = [settings.Issuer, settings.Issuer + "/"],
            ValidAudience = settings.ClientId,
            IssuerSigningKeys = configuration.SigningKeys,
            ValidAlgorithms = s_algorithms,
            RequireSignedTokens = true,
            RequireExpirationTime = true,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(2),
        });
        if (!result.IsValid || result.SecurityToken is not JsonWebToken token || !Matches(token, "nonce", flow.Nonce))
        {
            return null;
        }

        return Read(token, settings.GroupsClaim);
    }

    private static SsoClaims? Read(JsonWebToken token, string groupsClaim)
    {
        var email = Text(token, "email");
        if (string.IsNullOrEmpty(token.Subject) || email is null || IsUnverified(token))
        {
            return null;
        }

        var name = Text(token, "name") ?? Text(token, "preferred_username") ?? email;
        return new SsoClaims(token.Subject, email, name, Groups(token, groupsClaim));
    }

    private static bool Matches(JsonWebToken token, string claim, string expected) =>
        Text(token, claim) is { } actual
        && CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(actual), Encoding.UTF8.GetBytes(expected));

    private static bool IsUnverified(JsonWebToken token) =>
        token.TryGetPayloadValue<bool>("email_verified", out var verified) && !verified;

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
