using System.Text.Json;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Security.Tokens;

namespace Datapoint.Apiary.Management.SingleSignOn;

public sealed class SsoAssertions(SealedTokens tokens, TimeProvider time)
{
    public static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(2);

    private const string Purpose = "apiary.sso-identity";

    public string Seal(string issuer, string subject, string email, string name, IReadOnlyList<string> groups)
    {
        var identity = new SsoIdentity(issuer, subject, email, name, groups, time.GetUtcNow() + Lifetime);
        return tokens.Seal(Purpose, JsonSerializer.SerializeToUtf8Bytes(identity, SsoJsonContext.Default.SsoIdentity));
    }

    public SsoIdentity Open(string assertion)
    {
        var payload = string.IsNullOrEmpty(assertion) ? null : tokens.Open(Purpose, assertion);
        var identity = payload is null ? null : JsonSerializer.Deserialize(payload, SsoJsonContext.Default.SsoIdentity);
        if (identity is null || identity.ExpiresAt <= time.GetUtcNow())
        {
            throw ActionFailedException.Invalid(ErrorCodes.SsoFailed);
        }

        return identity;
    }
}
