using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Users;

[Action("users.renew-invite", "Makes a new invite link for someone who hasn't accepted theirs yet. The previous link stops working.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Administrator)]
public sealed record RenewInvite([property: Description("The user's id.")] Guid Id) : ICommand<InviteLink>, IConfidentialResult;
