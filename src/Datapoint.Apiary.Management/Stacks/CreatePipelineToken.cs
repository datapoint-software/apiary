using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Stacks;

[Action("pipeline-tokens.create", "Creates a pipeline token that can apply one stack's file, and returns it. It's shown only once: Apiary keeps only a hash.")]
[Api]
[RequiresRole(Role.Administrator)]
public sealed record CreatePipelineToken(
    [property: Description("The stack the token can apply.")] string Stack,
    [property: Description("The token's name, such as gitlab-shop-deploy. It's in the audit log for every apply.")] string Name,
    [property: Description("Days until it expires: 30, 90 or 365.")] int Days = 90)
    : ICommand<NewPipelineToken>, IConfidentialResult;
