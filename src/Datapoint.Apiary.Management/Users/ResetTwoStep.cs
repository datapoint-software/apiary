using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Users;

[Action("users.reset-two-step", Description = "Turns off someone's two-step sign-in, for when they lost their phone, and signs them out everywhere. They set it up again at their next sign-in.")]
[RequiresRole(Role.Administrator)]
public sealed record ResetTwoStep([property: Description("The user's id.")] Guid Id) : ICommand;
