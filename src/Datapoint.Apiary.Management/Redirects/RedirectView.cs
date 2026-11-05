using Datapoint.Apiary.Cluster.Redirects;
using Datapoint.Apiary.Cluster.Stacks;

namespace Datapoint.Apiary.Management.Redirects;

public sealed record RedirectView(
    Guid Id,
    Guid ProjectId,
    string From,
    string Path,
    string To,
    int StatusCode,
    bool KeepPath,
    DateTimeOffset ChangedAt,
    string? ChangedBy,
    StackSource? Stack)
{
    public static RedirectView Of(Redirect redirect) =>
        new(redirect.Id, redirect.ProjectId, redirect.From, redirect.Path, redirect.To, redirect.StatusCode, redirect.KeepPath, redirect.ChangedAt, redirect.ChangedBy, redirect.Stack);
}
