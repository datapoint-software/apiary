using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Account;

[Action("account.new-recovery-codes", "Replaces your recovery codes with 10 new ones, after checking your password. The old ones stop working.")]
[Api]
[RequiresRole(Role.Viewer)]
public sealed record NewRecoveryCodes([property: Description("Your password, to confirm it's you.")] string Password)
    : ICommand<IReadOnlyList<string>>, IConfidentialResult;
