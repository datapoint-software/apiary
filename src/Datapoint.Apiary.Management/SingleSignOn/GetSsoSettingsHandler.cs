using Datapoint.Apiary.Cluster.State;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.SingleSignOn;

public sealed class GetSsoSettingsHandler(IClusterState cluster) : IQueryHandler<GetSsoSettings, SsoSettingsView>
{
    public ValueTask<SsoSettingsView> HandleAsync(GetSsoSettings query, CancellationToken ct = default) =>
        new(SsoSettingsView.From(cluster.Current.SingleSignOn));
}
