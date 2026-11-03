using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Redirects;

[Action("redirects.delete", Description = "Deletes a redirect. Requests to its hostname get a 404 on every replica as soon as it's deleted, though browsers may remember a permanent redirect for a while.")]
[RequiresRole(Role.Operator)]
public sealed record DeleteRedirect([property: Description("The redirect's id.")] Guid Id) : ICommand;
