using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Redirects;

public sealed record RedirectSaved(Redirect Redirect) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { Redirects = state.Redirects.SetItem(Redirect.Id, Redirect) };
}
