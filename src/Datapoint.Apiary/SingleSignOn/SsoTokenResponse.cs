using System.Text.Json.Serialization;

namespace Datapoint.Apiary.SingleSignOn;

public sealed record SsoTokenResponse(
    [property: JsonPropertyName("id_token")] string? IdToken,
    [property: JsonPropertyName("error")] string? Error = null);
