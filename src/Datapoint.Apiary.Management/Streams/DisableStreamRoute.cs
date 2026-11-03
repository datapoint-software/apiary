using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Streams;

[Action("streams.disable", Description = "Turns a stream route off without deleting it. Every replica stops listening on its port and closes its open connections until it's enabled again; its settings are kept.")]
[RequiresRole(Role.Operator)]
public sealed record DisableStreamRoute([property: Description("The stream route's id.")] Guid Id) : ICommand;
