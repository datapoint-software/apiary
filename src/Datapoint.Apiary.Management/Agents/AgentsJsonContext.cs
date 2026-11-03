using System.Text.Json.Serialization;

namespace Datapoint.Apiary.Management.Agents;

[JsonSerializable(typeof(AgentClient))]
public sealed partial class AgentsJsonContext : JsonSerializerContext;
