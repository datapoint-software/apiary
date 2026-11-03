using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Auth;

public sealed class GetMeHandler(IClusterState cluster, CurrentUser current) : IQueryHandler<GetMe, SignedInUser>
{
    public ValueTask<SignedInUser> HandleAsync(GetMe query, CancellationToken ct = default)
    {
        var user = current.Require(cluster.Current);
        return new(new SignedInUser(
            user.Id, user.Name, user.Email, user.Role, user.TwoStep?.SetUpAt, user.TwoStep?.RecoveryCodeHashes.Count ?? 0, user.ExternalId is not null));
    }
}
