using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Auth;

[Action("auth.me", Description = "Returns the signed-in user: name, email, role and two-step sign-in status.")]
[RequiresRole(Role.Viewer)]
public sealed record GetMe : IQuery<SignedInUser>;
