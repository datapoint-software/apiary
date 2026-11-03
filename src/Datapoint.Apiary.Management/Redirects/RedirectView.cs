using Datapoint.Apiary.Cluster.Redirects;

namespace Datapoint.Apiary.Management.Redirects;

public sealed record RedirectView(
    Guid Id,
    Guid ProjectId,
    string From,
    string To,
    int StatusCode,
    bool KeepPath,
    DateTimeOffset ChangedAt,
    string? ChangedBy)
{
    public static RedirectView Of(Redirect redirect) =>
        new(redirect.Id, redirect.ProjectId, redirect.From, redirect.To, redirect.StatusCode, redirect.KeepPath, redirect.ChangedAt, redirect.ChangedBy);
}
