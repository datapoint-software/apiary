using System.ComponentModel;
using Datapoint.Apiary.Cluster.Streams;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Streams;

[Action("streams.update", Description = "Replaces all of a stream route's settings. Open connections are closed if the port, protocol or target changes.")]
[RequiresRole(Role.Operator)]
public sealed record UpdateStreamRoute(
    [property: Description("The stream route's id.")] Guid Id,
    [property: Description("The id of the project the stream route belongs to.")] Guid ProjectId,
    [property: Description("A name for people, such as MQTT. At most 40 characters.")] string Name,
    [property: Description("Tcp or Udp.")] StreamProtocol Protocol,
    [property: Description("The port Apiary listens on, from 1 to 65535. It can't be one of Apiary's own ports.")] int ListenPort,
    [property: Description("The target's hostname or IP address on the shared network, such as mqtt. Loopback and link-local addresses, cloud metadata endpoints and Apiary's admin, Raft and cluster ports are refused.")] string TargetHost,
    [property: Description("The target's port.")] int TargetPort,
    [property: Description("TCP only: TLS server names (SNI) this route answers, such as mqtt.example.com or *.example.com. Leave it empty to take every connection on the port.")] IReadOnlyList<string>? ServerNames = null,
    [property: Description("UDP only: seconds without traffic before a client's session ends, from 1 to 3600.")] int IdleTimeoutSeconds = StreamRules.DefaultIdleTimeoutSeconds,
    [property: Description("The addresses and ranges allowed to connect, such as 10.0.0.0/8 or 2001:db8::/32. Connections from anywhere else are closed. Leave it empty to allow everyone. Only works when the port is published in host mode, since Swarm's ingress hides the client's address.")] IReadOnlyList<string>? AllowedAddresses = null)
    : ICommand, IStreamFields;
