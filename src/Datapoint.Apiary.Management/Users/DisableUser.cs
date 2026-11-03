using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Users;

[Action("users.disable", "Disables someone's account and signs them out everywhere. Their history stays in the audit log.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Administrator)]
public sealed record DisableUser([property: Description("The user's id.")] Guid Id) : ICommand;
