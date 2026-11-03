using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Account;

[Action("account.sessions", Description = "Lists where you're signed in: browser, IP address and when.")]
[RequiresRole(Role.Viewer)]
public sealed record ListSessions : IQuery<IReadOnlyList<SessionView>>;
