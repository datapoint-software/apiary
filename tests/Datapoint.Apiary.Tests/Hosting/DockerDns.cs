using System.Collections.Concurrent;
using System.Net;

namespace Datapoint.Apiary.Tests.Hosting;

internal sealed class DockerDns
{
    private readonly ConcurrentDictionary<IPAddress, bool> _running = new();

    public IReadOnlyList<IPAddress> Running => [.. _running.Keys.Order(Comparer<IPAddress>.Create((a, b) => a.GetAddressBytes()[3].CompareTo(b.GetAddressBytes()[3])))];

    public void Add(IPAddress address) => _running[address] = true;

    public void Remove(IPAddress address) => _running.TryRemove(address, out _);
}
