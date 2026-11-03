using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Users;

[Action("users.update-session-policy", Description = "Sets how many minutes without activity sign people out of the admin interface, from 5 to 720. Agents aren't affected.")]
[RequiresRole(Role.Administrator)]
public sealed record UpdateSessionPolicy(
    [property: Description("Minutes without activity before a sign-in ends, from 5 to 720.")] int IdleMinutes) : ICommand;
