using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Replicas;

public sealed record MembershipChanged(MembershipSettings Membership) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { Membership = Membership };
}
