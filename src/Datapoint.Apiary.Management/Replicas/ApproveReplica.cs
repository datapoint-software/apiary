using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Replicas;

[Action("cluster.approve-replica", Description = "Lets a replica that waits for approval join the cluster, in manual membership. It then receives the state and starts serving traffic.")]
[RequiresRole(Role.Administrator)]
public sealed record ApproveReplica([property: Description("The waiting replica's id, from cluster.status.")] Guid Id) : ICommand;
