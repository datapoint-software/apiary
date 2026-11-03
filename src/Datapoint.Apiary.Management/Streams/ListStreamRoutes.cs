using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Streams;

[Action("streams.list", "Lists the TCP and UDP stream routes, sorted by port: each one's project, name, protocol, port, target, TLS server names and open connections across replicas.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Viewer)]
public sealed record ListStreamRoutes(
    [property: Description("Only the stream routes of this project. Leave it out for every project.")] Guid? ProjectId = null)
    : IQuery<IReadOnlyList<StreamRouteView>>;
