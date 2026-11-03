using System.Diagnostics.Metrics;
using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Telemetry;

public sealed class ClusterMetrics
{
    public const string MeterName = "Datapoint.Apiary.Cluster";
    private readonly Counter<long> _failedWrites;

    public ClusterMetrics(IMeterFactory meters, IClusterState cluster)
    {
        var meter = meters.Create(MeterName);
        meter.CreateObservableGauge("apiary.cluster.leader", () => cluster.IsLeader ? 1 : 0, "{replica}", "1 on the replica that leads the cluster, 0 on the others.");
        meter.CreateObservableGauge("apiary.cluster.writable", () => cluster.IsWritable ? 1 : 0, "{replica}", "1 while this replica can reach a majority and accept changes, 0 otherwise.");
        meter.CreateObservableGauge("apiary.cluster.state.index", () => cluster.Current.Index, "{change}", "The index of the last change this replica applied. Replicas that fall behind have a lower index than the leader.");
        _failedWrites = meter.CreateCounter<long>("apiary.cluster.writes.failed", "{write}", "Changes the cluster couldn't save, for example without a majority.");
    }

    public void WriteFailed(string reason) => _failedWrites.Add(1, new KeyValuePair<string, object?>("error.type", reason));
}
