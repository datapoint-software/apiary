using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Streams;

[Action("streams.delete", "Deletes a stream route. Its port refuses new connections on every replica at once, and open connections are closed.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Operator)]
public sealed record DeleteStreamRoute([property: Description("The stream route's id.")] Guid Id) : ICommand;
