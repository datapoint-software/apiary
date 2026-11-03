using System.ComponentModel;
using Datapoint.Apiary.Cluster.Streams;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Apiary.Management.Validation;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Streams;

[Action("streams.check", Description = "Checks whether a port is free for a stream route, for forms to warn as people type. Saving still checks everything.")]
[RequiresRole(Role.Operator)]
public sealed record CheckStreamRoute(
    [property: Description("Tcp or Udp.")] StreamProtocol Protocol,
    [property: Description("The port to listen on.")] int ListenPort,
    [property: Description("TCP only: the TLS server names.")] IReadOnlyList<string>? ServerNames = null,
    [property: Description("The stream route being edited, which may keep its own port.")] Guid? Id = null)
    : IQuery<IReadOnlyList<FieldCheck>>;
