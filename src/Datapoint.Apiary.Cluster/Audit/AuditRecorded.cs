using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Audit;

public sealed record AuditRecorded(AuditEntry Entry) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { Audit = state.Audit.Add(Entry) };
}
