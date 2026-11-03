using System.Text.Json.Serialization;

namespace Datapoint.Apiary.SingleSignOn;

[JsonSerializable(typeof(SsoFlow))]
[JsonSerializable(typeof(SsoTokenResponse))]
internal sealed partial class SsoHostJsonContext : JsonSerializerContext;
