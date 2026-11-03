using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Users;

[Action("users.session-policy", "Gets how many minutes without activity sign people out of the admin interface. Agents aren't affected.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Administrator)]
public sealed record GetSessionPolicy : IQuery<SessionPolicyView>;
