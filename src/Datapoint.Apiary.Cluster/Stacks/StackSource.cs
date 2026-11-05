namespace Datapoint.Apiary.Cluster.Stacks;

public sealed record StackSource(string Stack, string Service, string Name, IReadOnlyList<string> Fields)
{
    public bool Sets(string field) => Fields.Contains(field, StringComparer.Ordinal);
}
