using System.Text.Json.Serialization;
using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Join;

[JsonSourceGenerationOptions(
    PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase,
    UseStringEnumConverter = true,
    RespectNullableAnnotations = true)]
[JsonSerializable(typeof(JoinRequest))]
[JsonSerializable(typeof(JoinResponse))]
[JsonSerializable(typeof(ReplicaAnnouncement))]
[JsonSerializable(typeof(SharedKeyRing))]
[JsonSerializable(typeof(Acme.AcmeChallenge))]
[JsonSerializable(typeof(Replicas.ClusterView))]
public sealed partial class ClusterWireJsonContext : JsonSerializerContext;
