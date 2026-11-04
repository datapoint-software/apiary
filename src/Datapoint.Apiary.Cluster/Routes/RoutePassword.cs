namespace Datapoint.Apiary.Cluster.Routes;

public sealed record RoutePassword(
    string Hash,
    string CookieKey,
    DateTimeOffset SetAt,
    string? SetBy,
    int Days,
    string? Message = null,
    RouteLink? Link = null);
