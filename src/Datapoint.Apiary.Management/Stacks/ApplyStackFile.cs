using System.ComponentModel;
using Datapoint.Apiary.Cluster.Stacks;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Stacks;

[Action("stacks.apply", "Makes a stack's routes, stream routes and redirects match what its stack file declares, in one change on every replica, and returns the plan: what it added, changed and removed. Only a pipeline token for the stack can call it; `apiary apply` sends it.")]
[Api]
public sealed record ApplyStackFile(
    [property: Description("The stack's name, as docker stack deploy names it, such as shop.")] string Stack,
    [property: Description("The routes the stack file declares.")] IReadOnlyList<DeclaredRoute> Routes,
    [property: Description("The stream routes the stack file declares.")] IReadOnlyList<DeclaredStreamRoute> StreamRoutes,
    [property: Description("The redirects the stack file declares.")] IReadOnlyList<DeclaredRedirect> Redirects,
    [property: Description("The commit the pipeline deployed, as the pipeline reports it.")] string? Commit = null,
    [property: Description("A link to the pipeline run, starting with https://.")] string? PipelineUrl = null,
    [property: Description("Returns the plan without applying it.")] bool DryRun = false,
    [property: Description("Applies even when it would remove everything the stack declares.")] bool AllowRemovingAll = false)
    : ICommand<StackPlan>, IStackPipelineAction;
