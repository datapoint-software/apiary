using System.Collections.Concurrent;
using System.Net;

namespace Datapoint.Apiary.Proxy.Streams;

public sealed class AddressCounts(int limit)
{
    private readonly ConcurrentDictionary<IPAddress, int> _counts = new();

    public bool TryAdd(IPAddress? address)
    {
        if (address is null)
        {
            return true;
        }

        while (true)
        {
            var count = _counts.GetValueOrDefault(address);
            if (count >= limit)
            {
                return false;
            }

            if (count == 0 ? _counts.TryAdd(address, 1) : _counts.TryUpdate(address, count + 1, count))
            {
                return true;
            }
        }
    }

    public void Remove(IPAddress? address)
    {
        if (address is null)
        {
            return;
        }

        while (_counts.TryGetValue(address, out var count))
        {
            if (count <= 1 ? _counts.TryRemove(new KeyValuePair<IPAddress, int>(address, count)) : _counts.TryUpdate(address, count - 1, count))
            {
                return;
            }
        }
    }
}
