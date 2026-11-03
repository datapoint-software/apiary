using System.Text.Json.Serialization;

namespace Datapoint.Apiary.Proxy.AccessLogs;

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase, DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull)]
[JsonSerializable(typeof(AccessLogEntry))]
public sealed partial class AccessLogJsonContext : JsonSerializerContext;
