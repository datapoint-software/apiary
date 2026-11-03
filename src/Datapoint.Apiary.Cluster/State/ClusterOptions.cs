namespace Datapoint.Apiary.Cluster.State;

public sealed class ClusterOptions
{
    public string DataDirectory { get; set; } = "data";

    public int SnapshotEvery { get; set; } = 1000;
}
