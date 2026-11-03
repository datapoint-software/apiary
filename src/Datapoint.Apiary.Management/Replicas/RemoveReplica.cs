using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Replicas;

[Action("cluster.remove-replica", "Removes a replica that can't be reached from the cluster now, instead of waiting for the timeout, so it no longer counts towards the majority. If it comes back, it joins again as a new replica.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Administrator)]
public sealed record RemoveReplica([property: Description("The replica's id, from cluster.status.")] Guid Id) : ICommand;
