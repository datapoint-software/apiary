using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Audit;

public sealed class ListAuditHandler(IClusterState cluster) : IQueryHandler<ListAudit, IReadOnlyList<AuditEntry>>
{
    private const int MaximumEntries = 500;

    public ValueTask<IReadOnlyList<AuditEntry>> HandleAsync(ListAudit query, CancellationToken ct = default) =>
        new([.. cluster.Current.Audit
            .AsEnumerable()
            .Reverse()
            .Where(e => Matches(query, e))
            .Take(MaximumEntries)]);

    private static bool Matches(ListAudit query, AuditEntry entry) =>
        InRange(query, entry)
        && (string.IsNullOrEmpty(query.User) || string.Equals(entry.User, query.User, StringComparison.OrdinalIgnoreCase))
        && (!query.FailedOnly || entry.Outcome is not AuditOutcome.Succeeded)
        && (query.Via is not { } via || Via(entry) == via)
        && (string.IsNullOrWhiteSpace(query.Search) || Contains(entry, query.Search.Trim()));

    private static bool InRange(ListAudit query, AuditEntry entry) =>
        (query.From is not { } from || entry.At >= from)
        && (query.To is not { } to || entry.At <= to);

    private static AuditVia Via(AuditEntry entry) => entry switch
    {
        { User: null } => AuditVia.System,
        { Client: not null } => AuditVia.Agents,
        _ => AuditVia.People,
    };

    private static bool Contains(AuditEntry entry, string text) =>
        new[] { entry.Action, entry.User, entry.Client, entry.Address }.Concat(entry.Affected)
            .Any(value => value?.Contains(text, StringComparison.OrdinalIgnoreCase) is true);
}
