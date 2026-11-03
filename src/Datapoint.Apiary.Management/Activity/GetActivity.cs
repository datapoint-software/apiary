using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Activity;

[Action("activity.get", "Shows the proxy's traffic across replicas over the last hour, in 1-minute points, or the last 24 hours, in 15-minute points: requests, 5xx responses and the 95th percentile of response time in milliseconds. Each replica keeps this in memory, so a restart clears its share.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Viewer)]
public sealed record GetActivity(
    [property: Description("The last hour or the last 24 hours.")] ActivityRange Range = ActivityRange.Day) : IQuery<ActivityView>;
