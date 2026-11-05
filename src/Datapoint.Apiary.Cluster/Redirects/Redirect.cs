namespace Datapoint.Apiary.Cluster.Redirects;

public sealed record Redirect(
    Guid Id,
    Guid ProjectId,
    string From,
    string To,
    int StatusCode,
    bool KeepPath,
    DateTimeOffset ChangedAt,
    string? ChangedBy)
{
    public const string WholeHost = "/";

    public string Path { get => field ?? WholeHost; init; }

    public Stacks.StackSource? Stack { get; init; }
}
