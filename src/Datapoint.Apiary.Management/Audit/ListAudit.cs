using System.ComponentModel;
using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Audit;

[Action("audit.list", "Lists audit log entries, newest first: who changed what, from which IP address, and whether it succeeded. At most 500 entries.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Viewer)]
public sealed record ListAudit(
    [property: Description("The earliest time to include, in UTC.")] DateTimeOffset? From = null,
    [property: Description("The latest time to include, in UTC.")] DateTimeOffset? To = null,
    [property: Description("Only entries by the user who has this email now, including entries from before they changed it.")] string? User = null,
    [property: Description("Only denied and failed entries.")] bool FailedOnly = false,
    [property: Description("Only entries made by people in the interface, by agents over MCP, by CI pipelines applying a stack file, or by the system.")] AuditVia? Via = null,
    [property: Description("Only entries whose action, user, agent, address or affected names contain this text, ignoring case.")] string? Search = null) : IQuery<IReadOnlyList<AuditEntry>>;
