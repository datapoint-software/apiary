namespace Datapoint.Apiary.SingleSignOn;

public sealed record SsoFlow(string Issuer, string State, string Nonce, string Verifier, string Next, DateTimeOffset ExpiresAt);
