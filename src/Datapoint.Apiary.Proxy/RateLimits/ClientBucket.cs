using System.Net;

namespace Datapoint.Apiary.Proxy.RateLimits;

public readonly record struct ClientBucket(string Scope, IPAddress Client, int Limit, TimeSpan Period);
