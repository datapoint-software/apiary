using System.Net;
using System.Net.Sockets;
using Datapoint.Apiary.Cluster.Streams;

namespace Datapoint.Apiary.Proxy.Streams;

public sealed class UdpStreamSession(StreamRoute route, EndPoint client, Socket target, TimeProvider time) : IDisposable
{
    private long _lastActivity = time.GetTimestamp();

    public StreamRoute Route { get; } = route;

    public EndPoint Client { get; } = client;

    public Socket Target { get; } = target;

    public void Touch() => Interlocked.Exchange(ref _lastActivity, time.GetTimestamp());

    public bool IsIdle(TimeSpan timeout) => time.GetElapsedTime(Interlocked.Read(ref _lastActivity)) > timeout;

    public void Dispose() => Target.Dispose();
}
