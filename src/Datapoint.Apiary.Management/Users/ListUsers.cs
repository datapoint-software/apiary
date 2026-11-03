using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Users;

[Action("users.list", "Lists everyone with access to Apiary, with their role, status and whether two-step sign-in is on.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Administrator)]
public sealed record ListUsers : IQuery<IReadOnlyList<UserView>>;
