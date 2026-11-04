using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Brands;

[Action("brands.list", "Gets the brands of the visitor pages: the cluster's, and each project's own. For the admin UI, since it includes the logos.")]
[Api]
[RequiresRole(Role.Viewer)]
public sealed record ListBrands : IQuery<BrandsView>;
