using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Invites;

public sealed class GetInviteHandler(IClusterState cluster, Challenges challenges, TimeProvider time) : IQueryHandler<GetInvite, InviteView>
{
    public ValueTask<InviteView> HandleAsync(GetInvite query, CancellationToken cancellationToken = default)
    {
        var user = InviteTokens.Find(cluster.Current, query.Token, time.GetUtcNow());
        return new(new InviteView(user.Name, user.Email, challenges.Enroll(ChallengePurpose.Invite, user.Id, user.Email)));
    }
}
