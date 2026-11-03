using Datapoint.Apiary.Cluster.State;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.SingleSignOn;

public sealed class GetSignInOptionsHandler(IClusterState cluster) : IQueryHandler<GetSignInOptions, SignInOptions>
{
    public ValueTask<SignInOptions> HandleAsync(GetSignInOptions query, CancellationToken ct = default) =>
        new(new SignInOptions(cluster.Current.SingleSignOn is { Enabled: true } sso ? sso.DisplayName : null));
}
