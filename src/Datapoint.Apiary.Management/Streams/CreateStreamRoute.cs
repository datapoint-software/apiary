using System.ComponentModel;
using Datapoint.Apiary.Cluster.Streams;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Streams;

[Action("streams.create", Description = "Forwards raw TCP or UDP from a port on every replica to a target, and returns the new stream route's id. The port must also be published in the stack file to receive traffic.")]
[RequiresRole(Role.Operator)]
public sealed record CreateStreamRoute(
    [property: Description("The id of the project the stream route belongs to.")] Guid ProjectId,
    [property: Description("A name for people, such as MQTT. At most 40 characters.")] string Name,
    [property: Description("Tcp or Udp.")] StreamProtocol Protocol,
    [property: Description("The port Apiary listens on, from 1 to 65535. It can't be one of Apiary's own ports.")] int ListenPort,
    [property: Description("The target's hostname or IP address on the shared network, such as mqtt. Loopback and link-local addresses are refused.")] string TargetHost,
    [property: Description("The target's port.")] int TargetPort,
    [property: Description("TCP only: TLS server names (SNI) this route answers, such as mqtt.example.com or *.example.com, so several TLS services can share a port without Apiary decrypting them. Leave it empty to take every connection on the port.")] IReadOnlyList<string>? ServerNames = null,
    [property: Description("UDP only: seconds without traffic before a client's session ends, from 1 to 3600.")] int IdleTimeoutSeconds = StreamRules.DefaultIdleTimeoutSeconds)
    : ICommand<Guid>, IStreamFields;
