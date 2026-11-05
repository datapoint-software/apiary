using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Stacks;

[Action("stacks.add", "Adds a stack before its first apply, with its first pipeline token, and returns the token. It's shown only once: Apiary keeps only a hash.")]
[Api]
[RequiresRole(Role.Administrator)]
public sealed record AddStackWithToken(
    [property: Description("The stack's name, as docker stack deploy names it, such as shop.")] string Name,
    [property: Description("The first pipeline token's name, such as shop-deploy. It's in the audit log for every apply.")] string TokenName,
    [property: Description("The project its routes go to when their labels don't name one, or null.")] Guid? ProjectId = null,
    [property: Description("Days until the token expires: 30, 90 or 365.")] int TokenDays = 90)
    : ICommand<NewPipelineToken>, IConfidentialResult;
