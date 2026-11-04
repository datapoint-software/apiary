using System.Net;
using System.Net.Sockets;
using System.Threading.RateLimiting;

namespace Datapoint.Apiary.Proxy.RateLimits;

public sealed class ClientRateLimiter : IDisposable
{
    private const int Ipv6NetworkBytes = 8;

    private readonly PartitionedRateLimiter<ClientBucket> _limiter =
        PartitionedRateLimiter.Create<ClientBucket, ClientBucket>(bucket => RateLimitPartition.GetTokenBucketLimiter(bucket, Options));

    public bool TryAcquire(string scope, IPAddress? client, int perMinute, out TimeSpan retryAfter) =>
        TryAcquire(scope, client, perMinute, TimeSpan.FromMinutes(1), out retryAfter);

    public bool TryAcquire(string scope, IPAddress? client, int limit, TimeSpan period, out TimeSpan retryAfter)
    {
        retryAfter = TimeSpan.Zero;
        if (client is null || limit <= 0)
        {
            return true;
        }

        using var lease = _limiter.AttemptAcquire(new ClientBucket(scope, NetworkOf(client), limit, period));
        retryAfter = lease.IsAcquired ? TimeSpan.Zero : period / limit;
        return lease.IsAcquired;
    }

    public void Dispose() => _limiter.Dispose();

    public static IPAddress NetworkOf(IPAddress client)
    {
        var address = client.IsIPv4MappedToIPv6 ? client.MapToIPv4() : client;
        if (address.AddressFamily is not AddressFamily.InterNetworkV6)
        {
            return address;
        }

        var bytes = address.GetAddressBytes();
        Array.Clear(bytes, Ipv6NetworkBytes, bytes.Length - Ipv6NetworkBytes);
        return new IPAddress(bytes);
    }

    private static TokenBucketRateLimiterOptions Options(ClientBucket bucket) => new()
    {
        TokenLimit = bucket.Limit,
        TokensPerPeriod = bucket.Limit,
        ReplenishmentPeriod = bucket.Period,
        QueueLimit = 0,
        AutoReplenishment = true,
    };
}
