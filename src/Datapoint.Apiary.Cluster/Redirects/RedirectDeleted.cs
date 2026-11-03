using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Redirects;

public sealed record RedirectDeleted(Guid RedirectId) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { Redirects = state.Redirects.Remove(RedirectId) };
}
