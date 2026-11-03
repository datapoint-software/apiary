using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Account;

[Action("account.new-recovery-codes", Description = "Replaces your recovery codes with 10 new ones. The old ones stop working.")]
[RequiresRole(Role.Viewer)]
public sealed record NewRecoveryCodes : ICommand<IReadOnlyList<string>>;
