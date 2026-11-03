using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Keys;

public sealed record RootKeysForgotten(string KeptId) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { RootKeys = state.RootKeys.RemoveAll(k => k.Keys.RootKeyId != KeptId) };
}
