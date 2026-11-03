using System.Text.Json.Serialization;

namespace Datapoint.Apiary.Cluster.State;

[JsonSourceGenerationOptions(
    PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase,
    UseStringEnumConverter = true,
    RespectNullableAnnotations = true)]
[JsonSerializable(typeof(StateEntry))]
[JsonSerializable(typeof(StateSnapshot))]
public sealed partial class ClusterJsonContext : JsonSerializerContext;
