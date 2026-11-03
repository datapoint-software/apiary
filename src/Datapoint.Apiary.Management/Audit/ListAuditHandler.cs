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
        (query.From is not { } from || entry.At >= from)
        && (query.To is not { } to || entry.At <= to)
        && (string.IsNullOrEmpty(query.User) || string.Equals(entry.User, query.User, StringComparison.OrdinalIgnoreCase))
        && (!query.FailedOnly || entry.Outcome is not AuditOutcome.Succeeded);
}
