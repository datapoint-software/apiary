namespace Datapoint.Apiary.Cluster.Proxies;

/// <summary>
/// A load balancer, CDN or other proxy in front of Apiary. Public routes believe the X-Forwarded-For and
/// X-Forwarded-Proto of connections from <see cref="Range"/>, an address or a range in CIDR notation.
/// </summary>
public sealed record TrustedProxy(Guid Id, string Range, string? Note);
