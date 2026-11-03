using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Auth;

[Action("auth.sign-out", "Signs out of the current session.")]
[Api]
[RequiresRole(Role.Viewer)]
public sealed record SignOut : ICommand;
