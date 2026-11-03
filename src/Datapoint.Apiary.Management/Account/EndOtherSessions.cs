using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Account;

[Action("account.end-other-sessions", Description = "Signs out all your sessions except this one.")]
[RequiresRole(Role.Viewer)]
public sealed record EndOtherSessions : ICommand;
