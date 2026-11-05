using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Redirects;

[Action("redirects.list", "Lists the redirects, sorted by hostname and path: each one's project, hostname, path (/ for the whole hostname), address, status code and whether it keeps the rest of the path.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Viewer)]
public sealed record ListRedirects(
    [property: Description("Only the redirects of this project. Leave it out for every project.")] Guid? ProjectId = null)
    : IQuery<IReadOnlyList<RedirectView>>;
