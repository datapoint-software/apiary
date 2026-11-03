using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Account;

public sealed class BeginTwoStepHandler(IClusterState cluster, CurrentUser current, Challenges challenges)
    : IQueryHandler<BeginTwoStep, TwoStepEnrollment>
{
    public ValueTask<TwoStepEnrollment> HandleAsync(BeginTwoStep query, CancellationToken ct = default)
    {
        var user = current.Require(cluster.Current);
        return new(challenges.Enroll(ChallengePurpose.Reenroll, user.Id, user.Email));
    }
}
