using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Account;

[Action("account.sessions", "Lists where you're signed in: browser, IP address and when.")]
[Api]
[RequiresRole(Role.Viewer)]
public sealed record ListSessions : IQuery<IReadOnlyList<SessionView>>;
