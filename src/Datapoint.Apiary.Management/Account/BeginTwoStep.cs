using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Account;

[Action("account.begin-two-step", Description = "Starts setting up two-step sign-in again, with a new authenticator app entry. The current setup keeps working until it's confirmed.")]
[RequiresRole(Role.Viewer)]
public sealed record BeginTwoStep : IQuery<TwoStepEnrollment>;
