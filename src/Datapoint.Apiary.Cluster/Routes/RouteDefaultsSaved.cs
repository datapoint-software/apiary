using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Routes;

public sealed record RouteDefaultsSaved(RouteDefaults Defaults) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { RouteDefaults = Defaults };
}
