using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Stacks;

[Action("stacks.list", "Lists the Swarm stacks whose routes come from their stack file's labels, with their last apply, whether it failed, and how many routes, stream routes and redirects each declares.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Viewer)]
public sealed record ListStacks : IQuery<IReadOnlyList<StackView>>;
