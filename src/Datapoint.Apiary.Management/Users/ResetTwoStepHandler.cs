using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Users;

public sealed class ResetTwoStepHandler(StateTransaction transaction, Sessions sessions) : ICommandHandler<ResetTwoStep>
{
    public ValueTask HandleAsync(ResetTwoStep command, CancellationToken ct = default)
    {
        var user = UserGuards.Find(transaction.State, command.Id);
        transaction.Record(new UserSaved(user with { TwoStep = null }));
        sessions.EndAll(user.Id);
        sessions.DisconnectAgents(user.Id);
        transaction.Affects(user.Id);
        return ValueTask.CompletedTask;
    }
}
