namespace Datapoint.Apiary.Certificates.Acme;

public sealed record AcmeNewOrder(IReadOnlyList<AcmeIdentifier> Identifiers);
