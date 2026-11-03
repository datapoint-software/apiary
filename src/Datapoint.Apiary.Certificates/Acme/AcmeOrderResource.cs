namespace Datapoint.Apiary.Certificates.Acme;

public sealed record AcmeOrderResource(string Status, IReadOnlyList<Uri> Authorizations, Uri Finalize, Uri? Certificate, AcmeProblem? Error);
