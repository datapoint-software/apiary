namespace Datapoint.Apiary.Certificates.Acme;

public sealed record AcmeNewAccount(bool TermsOfServiceAgreed, IReadOnlyList<string>? Contact);
