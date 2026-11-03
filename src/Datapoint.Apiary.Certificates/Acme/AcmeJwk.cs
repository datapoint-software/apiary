using System.Text.Json.Serialization;

namespace Datapoint.Apiary.Certificates.Acme;

public sealed record AcmeJwk(
    [property: JsonPropertyName("crv")] string Crv,
    [property: JsonPropertyName("kty")] string Kty,
    [property: JsonPropertyName("x")] string X,
    [property: JsonPropertyName("y")] string Y);
