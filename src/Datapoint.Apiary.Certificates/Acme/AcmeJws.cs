namespace Datapoint.Apiary.Certificates.Acme;

public sealed record AcmeJws(string Protected, string Payload, string Signature);
