namespace Datapoint.Apiary.Management.SingleSignOn;

public sealed record SsoIdentity(
    string Issuer,
    string Subject,
    string Email,
    string Name,
    IReadOnlyList<string> Groups,
    DateTimeOffset ExpiresAt)
{
    public string ExternalId => string.Concat(Issuer, "|", Subject);
}
