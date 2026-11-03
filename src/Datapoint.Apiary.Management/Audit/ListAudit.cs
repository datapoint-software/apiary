using System.ComponentModel;
using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Audit;

[Action("audit.list", Description = "Lists audit log entries, newest first: who changed what, from which IP address, and whether it succeeded. At most 500 entries.")]
[RequiresRole(Role.Viewer)]
public sealed record ListAudit(
    [property: Description("The earliest time to include, in UTC.")] DateTimeOffset? From = null,
    [property: Description("The latest time to include, in UTC.")] DateTimeOffset? To = null,
    [property: Description("Only entries by this user's email.")] string? User = null,
    [property: Description("Only denied and failed entries.")] bool FailedOnly = false) : IQuery<IReadOnlyList<AuditEntry>>;
