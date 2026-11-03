using Datapoint.Apiary.Cluster.Replicas;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Replicas;

[Action("cluster.status", Description = "Shows the replicas in the cluster as the replica answering sees them: which one leads, which are reachable, and whether changes can be saved.")]
[RequiresRole(Role.Viewer)]
public sealed record GetClusterStatus : IQuery<ClusterView>;
