namespace Datapoint.Apiary.SingleSignOn;

public sealed record SsoClaims(string Subject, string Email, string Name, IReadOnlyList<string> Groups);
