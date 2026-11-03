using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Apiary.Management.Validation;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Users;

[Action("users.check-email", "Checks whether an email address is free for a new user, for forms to warn as people type. Saving still checks everything.")]
[Api]
[RequiresRole(Role.Administrator)]
public sealed record CheckEmail([property: Description("The email address.")] string Email) : IQuery<IReadOnlyList<FieldCheck>>;
