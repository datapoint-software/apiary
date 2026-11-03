using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Routes;

public sealed record RouteDeleted(Guid RouteId) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { Routes = state.Routes.Remove(RouteId) };
}
