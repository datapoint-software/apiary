using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Stacks;

[Action("stacks.get", "Returns a stack: its last apply and the plan it applied, what it declares, and its pipeline tokens, without their values.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Viewer)]
public sealed record GetStackDetails([property: Description("The stack's name.")] string Name) : IQuery<StackDetailsView>;
