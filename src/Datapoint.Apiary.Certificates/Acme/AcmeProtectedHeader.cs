namespace Datapoint.Apiary.Certificates.Acme;

public sealed record AcmeProtectedHeader(string Alg, string Nonce, Uri Url, AcmeJwk? Jwk, Uri? Kid);
