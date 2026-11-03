using System.ComponentModel;
using Datapoint.Apiary.Cluster.Replicas;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Replicas;

[Action("cluster.update-membership", "Sets how replicas join and leave. Automatic: new replicas join on their own, and missing ones are removed after the timeout. Manual: new replicas wait for an administrator's approval, and missing ones stay until removed.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Administrator)]
public sealed record UpdateMembership(
    [property: Description("Automatic or Manual.")] MembershipMode Mode,
    [property: Description("In automatic mode, minutes a replica may be missing before it's removed, from 5 to 1440.")] int RemoveMissingAfterMinutes) : ICommand;
