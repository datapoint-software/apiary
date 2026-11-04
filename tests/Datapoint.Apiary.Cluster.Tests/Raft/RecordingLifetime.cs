using Microsoft.Extensions.Hosting;

namespace Datapoint.Apiary.Cluster.Tests.Raft;

public sealed class RecordingLifetime : IHostApplicationLifetime
{
    public CancellationToken ApplicationStarted => CancellationToken.None;

    public CancellationToken ApplicationStopping => CancellationToken.None;

    public CancellationToken ApplicationStopped => CancellationToken.None;

    public bool StopRequested { get; private set; }

    public void StopApplication() => StopRequested = true;
}
