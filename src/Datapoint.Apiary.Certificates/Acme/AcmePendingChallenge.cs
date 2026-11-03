namespace Datapoint.Apiary.Certificates.Acme;

public sealed record AcmePendingChallenge(string Host, string Token, string KeyAuthorization, Uri ChallengeUrl, Uri AuthorizationUrl);
