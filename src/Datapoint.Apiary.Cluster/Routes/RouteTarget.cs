namespace Datapoint.Apiary.Cluster.Routes;

public sealed record RouteTarget(string Host, int Port, int Weight);
