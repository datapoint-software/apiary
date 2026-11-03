using System.Text.Json;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Security.Tokens;
using Datapoint.Apiary.Security.TwoStep;

namespace Datapoint.Apiary.Management.Accounts;

public sealed class Challenges(SealedTokens tokens, TimeProvider time)
{
    public const string Issuer = "Apiary";

    private const string Purpose = "apiary.challenge";
    private static readonly TimeSpan s_lifetime = TimeSpan.FromMinutes(10);

    public string Issue(ChallengePurpose purpose, Guid? userId, string email, string? secret = null)
    {
        var challenge = new Challenge(purpose, userId, email, secret, time.GetUtcNow() + s_lifetime);
        return tokens.Seal(Purpose, JsonSerializer.SerializeToUtf8Bytes(challenge, AccountsJsonContext.Default.Challenge));
    }

    public TwoStepEnrollment Enroll(ChallengePurpose purpose, Guid? userId, string email)
    {
        var secret = Totp.NewSecret();
        return new TwoStepEnrollment(Issue(purpose, userId, email, secret), secret, Totp.Uri(secret, email, Issuer));
    }

    public Challenge Read(string token, params ReadOnlySpan<ChallengePurpose> purposes)
    {
        var payload = tokens.Open(Purpose, token);
        var challenge = payload is null ? null : JsonSerializer.Deserialize(payload, AccountsJsonContext.Default.Challenge);
        if (challenge is null || challenge.ExpiresAt <= time.GetUtcNow() || !purposes.Contains(challenge.Purpose))
        {
            throw ActionFailedException.Invalid(ErrorCodes.ChallengeExpired);
        }

        return challenge;
    }
}
