using System.Text.Json.Serialization;

namespace Datapoint.Apiary.Management.SingleSignOn;

[JsonSerializable(typeof(SsoIdentity))]
public sealed partial class SsoJsonContext : JsonSerializerContext;
