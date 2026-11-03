using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Account;

[Action("account.end-session", "Signs out one of your other sessions.")]
[Api]
[RequiresRole(Role.Viewer)]
public sealed record EndSession([property: Description("The session's id.")] Guid Id) : ICommand;
