using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Stacks;

[Action("pipeline-tokens.list", "Lists every pipeline token, with its stack, when it was last used and when it expires, without their values.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Administrator)]
public sealed record ListPipelineTokens : IQuery<IReadOnlyList<PipelineTokenView>>;
