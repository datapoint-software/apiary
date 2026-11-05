using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Redirects;

[StateSchema(4)]
public sealed record PathRedirectSaved(Redirect Redirect) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { Redirects = state.Redirects.SetItem(Redirect.Id, Redirect) };
}
