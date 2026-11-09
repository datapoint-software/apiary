using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Audit;

public sealed class ListAuditHandler(IClusterState cluster) : IQueryHandler<ListAudit, IReadOnlyList<AuditEntry>>
{
    private const int MaximumEntries = 500;

    public ValueTask<IReadOnlyList<AuditEntry>> HandleAsync(ListAudit query, CancellationToken cancellationToken = default)
    {
        var state = cluster.Current;
        var userId = string.IsNullOrEmpty(query.User) ? null : UserLookup.ByEmail(state, query.User)?.Id;
        return new([.. state.Audit
            .AsEnumerable()
            .Reverse()
            .Where(e => Matches(query, userId, e))
            .Take(MaximumEntries)]);
    }

    private static bool Matches(ListAudit query, Guid? userId, AuditEntry entry) =>
        InRange(query, entry)
        && IsBy(query.User, userId, entry)
        && (!query.FailedOnly || entry.Outcome is not AuditOutcome.Succeeded)
        && (query.Via is not { } via || Via(entry) == via)
        && (string.IsNullOrWhiteSpace(query.Search) || Contains(entry, query.Search.Trim()));

    private static bool IsBy(string? user, Guid? userId, AuditEntry entry) =>
        string.IsNullOrEmpty(user)
        || (userId is { } id && entry.UserId == id)
        || (entry.UserId is null && string.Equals(entry.User, user, StringComparison.OrdinalIgnoreCase));

    private static bool InRange(ListAudit query, AuditEntry entry) =>
        (query.From is not { } from || entry.At >= from)
        && (query.To is not { } to || entry.At <= to);

    private static AuditVia Via(AuditEntry entry) => entry switch
    {
        { Pipeline: not null } => AuditVia.Pipelines,
        { User: null } => AuditVia.System,
        { Client: not null } => AuditVia.Agents,
        _ => AuditVia.People,
    };

    private static bool Contains(AuditEntry entry, string text) =>
        new[] { entry.Action, entry.User, entry.Client, entry.Pipeline, entry.Address }.Concat(entry.Affected)
            .Any(value => value?.Contains(text, StringComparison.OrdinalIgnoreCase) is true);
}
