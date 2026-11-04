using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Brands;

[Action("brands.remove", "Removes the cluster's brand from the visitor pages, or a project's own brand so its pages use the cluster's again.")]
[Api]
[RequiresRole(Role.Operator)]
public sealed record RemoveBrand(
    [property: Description("The project whose own brand to remove, or null for the cluster's.")] Guid? ProjectId) : ICommand;
