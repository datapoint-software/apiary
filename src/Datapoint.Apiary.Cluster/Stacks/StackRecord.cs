namespace Datapoint.Apiary.Cluster.Stacks;

public sealed record StackRecord(string Name, Guid? ProjectId, DateTimeOffset CreatedAt, string? CreatedBy)
{
    public StackApply? LastApply { get; init; }

    public StackFailure? Failure { get; init; }
}
