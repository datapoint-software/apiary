using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Users;

[Action("users.change-role", "Changes someone's role. It applies at their next request.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Administrator)]
public sealed record ChangeRole(
    [property: Description("The user's id.")] Guid Id,
    [property: Description("The new role: Viewer, Operator or Administrator.")] Role Role) : ICommand;
