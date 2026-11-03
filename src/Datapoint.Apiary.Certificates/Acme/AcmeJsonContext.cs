using System.Text.Json.Serialization;

namespace Datapoint.Apiary.Certificates.Acme;

[JsonSourceGenerationOptions(
    PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull)]
[JsonSerializable(typeof(AcmeDirectory))]
[JsonSerializable(typeof(AcmeOrderResource))]
[JsonSerializable(typeof(AcmeAuthorization))]
[JsonSerializable(typeof(AcmeChallengeResource))]
[JsonSerializable(typeof(AcmeProblem))]
[JsonSerializable(typeof(AcmeNewAccount))]
[JsonSerializable(typeof(AcmeNewOrder))]
[JsonSerializable(typeof(AcmeFinalize))]
[JsonSerializable(typeof(AcmeEmpty))]
[JsonSerializable(typeof(AcmeJwk))]
[JsonSerializable(typeof(AcmeProtectedHeader))]
[JsonSerializable(typeof(AcmeJws))]
public sealed partial class AcmeJsonContext : JsonSerializerContext;
