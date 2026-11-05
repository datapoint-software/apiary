using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Stacks;

[Action("pipeline-tokens.revoke", "Revokes a pipeline token, so pipelines that use it can't apply its stack anymore. The routes it applied stay as they are.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Administrator)]
public sealed record RevokePipelineToken([property: Description("The token's id.")] Guid Id) : ICommand;
