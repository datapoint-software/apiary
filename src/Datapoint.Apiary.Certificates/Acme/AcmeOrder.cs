namespace Datapoint.Apiary.Certificates.Acme;

public sealed record AcmeOrder(Uri OrderUrl, Uri FinalizeUrl, IReadOnlyList<AcmePendingChallenge> Challenges);
