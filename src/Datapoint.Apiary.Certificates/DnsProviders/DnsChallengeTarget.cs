namespace Datapoint.Apiary.Certificates.DnsProviders;

public sealed record DnsChallengeTarget(string RecordName, string Zone, string? DelegatedFrom);
