using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Apiary.Management.Validation;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Redirects;

[Action("redirects.check", Description = "Checks whether a hostname is free for a new redirect, for forms to warn as people type. Saving still checks everything.")]
[RequiresRole(Role.Operator)]
public sealed record CheckRedirect([property: Description("The hostname to redirect.")] string From) : IQuery<IReadOnlyList<FieldCheck>>;
