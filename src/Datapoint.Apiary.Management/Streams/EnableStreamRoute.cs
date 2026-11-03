using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Streams;

[Action("streams.enable", "Turns a disabled stream route back on, with its saved settings. Every replica listens on its port again.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Operator)]
public sealed record EnableStreamRoute([property: Description("The stream route's id.")] Guid Id) : ICommand;
