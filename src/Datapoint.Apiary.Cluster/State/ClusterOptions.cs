namespace Datapoint.Apiary.Cluster.State;

public sealed class ClusterOptions
{
    public string DataDirectory { get; set; } = "data";

    public int SnapshotEvery { get; set; } = 1000;

    public ClusterMode Mode { get; set; } = ClusterMode.Standalone;

    public string ServiceName { get; set; } = "apiary";

    public int? Slot { get; set; }

    public string? NodeName { get; set; }

    public int RaftPort { get; set; } = 9444;

    public int ClusterPort { get; set; } = 9445;

    public TimeSpan MissingTimeout { get; set; } = TimeSpan.FromMinutes(2);

    public TimeSpan DataKeyLifetime { get; set; } = TimeSpan.FromDays(90);

    public TimeSpan ClusterCaRenewBefore { get; set; } = TimeSpan.FromDays(180);

    public TimeSpan ClusterCaOverlap { get; set; } = TimeSpan.FromDays(1);
}
