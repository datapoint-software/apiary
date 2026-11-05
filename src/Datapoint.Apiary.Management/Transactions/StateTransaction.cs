using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Management.Transactions;

public sealed class StateTransaction(IClusterState cluster)
{
    private readonly List<IStateChange> _changes = [];
    private readonly List<string> _affected = [];
    private ApiaryState? _state;

    public ApiaryState State => _state ?? cluster.Current;

    public IReadOnlyList<IStateChange> Changes => _changes;

    public IReadOnlyList<string> Affected => _affected;

    public Guid? ProjectId { get; private set; }

    public string? ActingAs { get; set; }

    public bool Unaudited { get; set; }

    public void Record(IStateChange change)
    {
        _changes.Add(change);
        _state = change.Apply(State);
    }

    public void Affects(Guid id, Guid? projectId = null)
    {
        _affected.Add(id.ToString());
        ProjectId ??= projectId;
    }

    public void AffectsName(string name) => _affected.Add(name);
}
