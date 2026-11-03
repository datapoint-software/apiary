using System.Text.Json.Serialization;
using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.Projects;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.Sessions;
using Datapoint.Apiary.Cluster.Users;

namespace Datapoint.Apiary.Cluster.State;

[JsonPolymorphic(TypeDiscriminatorPropertyName = "$change")]
[JsonDerivedType(typeof(ProjectSaved), "project.saved")]
[JsonDerivedType(typeof(RouteSaved), "route.saved")]
[JsonDerivedType(typeof(RouteDeleted), "route.deleted")]
[JsonDerivedType(typeof(UserSaved), "user.saved")]
[JsonDerivedType(typeof(UserDeleted), "user.deleted")]
[JsonDerivedType(typeof(SetupCompleted), "setup.completed")]
[JsonDerivedType(typeof(SessionStarted), "session.started")]
[JsonDerivedType(typeof(SessionsEnded), "sessions.ended")]
[JsonDerivedType(typeof(AuditRecorded), "audit.recorded")]
public interface IStateChange
{
    ApiaryState Apply(ApiaryState state);
}
