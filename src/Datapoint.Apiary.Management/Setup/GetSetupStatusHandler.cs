using Datapoint.Apiary.Cluster.State;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Setup;

public sealed class GetSetupStatusHandler(IClusterState cluster, SetupWindow window) : IQueryHandler<GetSetupStatus, SetupStatus>
{
    public ValueTask<SetupStatus> HandleAsync(GetSetupStatus query, CancellationToken ct = default) =>
        new(window.IsOpen(cluster.Current) ? new SetupStatus(true, window.ClosesAt) : new SetupStatus(false, null));
}
