using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Routes;

public sealed record RouteSaved(Route Route) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { Routes = state.Routes.SetItem(Route.Id, Route) };
}
