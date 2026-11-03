using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Users;

[Action("users.invite", Description = "Invites someone: creates their account and returns a one-time link, valid for 72 hours, where they set their password and two-step sign-in.")]
[RequiresRole(Role.Administrator)]
public sealed record InviteUser(
    [property: Description("Their name.")] string Name,
    [property: Description("Their email, used to sign in. Apiary doesn't send email.")] string Email,
    [property: Description("Their role: Viewer, Operator or Administrator.")] Role Role) : ICommand<InviteLink>, IConfidentialResult;
