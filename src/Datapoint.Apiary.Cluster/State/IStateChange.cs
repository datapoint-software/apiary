using System.Text.Json.Serialization;
using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.Projects;
using Datapoint.Apiary.Cluster.Routes;

namespace Datapoint.Apiary.Cluster.State;

[JsonPolymorphic(TypeDiscriminatorPropertyName = "$change")]
[JsonDerivedType(typeof(ProjectSaved), "project.saved")]
[JsonDerivedType(typeof(RouteSaved), "route.saved")]
[JsonDerivedType(typeof(RouteDeleted), "route.deleted")]
[JsonDerivedType(typeof(AuditRecorded), "audit.recorded")]
public interface IStateChange
{
    ApiaryState Apply(ApiaryState state);
}
