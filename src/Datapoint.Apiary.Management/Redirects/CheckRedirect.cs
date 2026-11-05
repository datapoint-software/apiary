using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Apiary.Management.Validation;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Redirects;

[Action("redirects.check", "Checks whether a hostname, or a path on it, is free for a new redirect, for forms to warn as people type. Saving still checks everything.")]
[Api]
[RequiresRole(Role.Operator)]
public sealed record CheckRedirect(
    [property: Description("The hostname to redirect.")] string From,
    [property: Description("The path to redirect, or null for the whole hostname.")] string? Path = null)
    : IQuery<IReadOnlyList<FieldCheck>>;
