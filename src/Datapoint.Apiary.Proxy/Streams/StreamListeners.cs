using System.Net.Sockets;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Cluster.Streams;
using Datapoint.Apiary.Proxy.Network;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Primitives;

namespace Datapoint.Apiary.Proxy.Streams;

public sealed partial class StreamListeners(
    IClusterState cluster,
    TargetConnector connector,
    StreamConnections connections,
    TimeProvider time,
    ILogger<StreamListeners> logger) : BackgroundService
{
    private static readonly TimeSpan s_retryEvery = TimeSpan.FromSeconds(30);
    private readonly Dictionary<(StreamProtocol Protocol, int Port), IStreamListener> _listeners = [];
    private readonly HashSet<(StreamProtocol Protocol, int Port)> _failed = [];
    private readonly SemaphoreSlim _changed = new(0);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var subscription = ChangeToken.OnChange(cluster.GetChangeToken, () => _changed.Release());
        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                Reconcile(cluster.Current);
                await _changed.WaitAsync(s_retryEvery, stoppingToken);
            }
        }
        catch (OperationCanceledException)
        {
        }
        finally
        {
            foreach (var listener in _listeners.Values)
            {
                await listener.DisposeAsync();
            }

            _listeners.Clear();
        }
    }

    public override void Dispose()
    {
        _changed.Dispose();
        base.Dispose();
    }

    private void Reconcile(ApiaryState state)
    {
        var wanted = state.StreamRoutes.Values
            .GroupBy(s => (s.Protocol, s.ListenPort))
            .ToDictionary(g => g.Key, g => (IReadOnlyList<StreamRoute>)[.. g.OrderBy(s => s.Id)]);
        foreach (var key in _listeners.Keys.Where(key => !wanted.ContainsKey(key)).ToList())
        {
            _ = _listeners[key].DisposeAsync().AsTask();
            _listeners.Remove(key);
        }

        foreach (var (key, routes) in wanted)
        {
            if (_listeners.TryGetValue(key, out var listener))
            {
                listener.Update(routes);
                continue;
            }

            Open(key, routes);
        }

        connections.Forget(state.StreamRoutes.Keys.ToHashSet());
    }

    private void Open((StreamProtocol Protocol, int Port) key, IReadOnlyList<StreamRoute> routes)
    {
        try
        {
            _listeners[key] = key.Protocol is StreamProtocol.Tcp
                ? new TcpStreamListener(key.Port, routes, connector, connections, logger)
                : new UdpStreamListener(key.Port, routes[0], connector, connections, time, logger);
            if (_failed.Remove(key))
            {
                LogListening(logger, key.Protocol, key.Port);
            }
        }
        catch (SocketException exception)
        {
            if (_failed.Add(key))
            {
                LogListenFailed(logger, key.Protocol, key.Port, exception.Message);
            }
        }
    }

    [LoggerMessage(Level = LogLevel.Error, Message = "Can't listen on {Protocol} port {Port} for a stream route: {Reason}. Trying again every 30 seconds.")]
    private static partial void LogListenFailed(ILogger logger, StreamProtocol protocol, int port, string reason);

    [LoggerMessage(Level = LogLevel.Information, Message = "Listening on {Protocol} port {Port} for a stream route")]
    private static partial void LogListening(ILogger logger, StreamProtocol protocol, int port);
}
