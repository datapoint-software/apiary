using System.Text.Json.Serialization;
using Datapoint.Apiary.Cluster.Acme;
using Datapoint.Apiary.Cluster.Agents;
using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.Backups;
using Datapoint.Apiary.Cluster.Brands;
using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Cluster.Locks;
using Datapoint.Apiary.Cluster.Projects;
using Datapoint.Apiary.Cluster.Redirects;
using Datapoint.Apiary.Cluster.Replicas;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.Sessions;
using Datapoint.Apiary.Cluster.Users;

namespace Datapoint.Apiary.Cluster.State;

[JsonPolymorphic(TypeDiscriminatorPropertyName = "$change")]
[JsonDerivedType(typeof(ProjectSaved), "project.saved")]
[JsonDerivedType(typeof(ProjectDeleted), "project.deleted")]
[JsonDerivedType(typeof(RouteSaved), "route.saved")]
[JsonDerivedType(typeof(RouteDeleted), "route.deleted")]
[JsonDerivedType(typeof(RedirectSaved), "redirect.saved")]
[JsonDerivedType(typeof(RedirectDeleted), "redirect.deleted")]
[JsonDerivedType(typeof(UserSaved), "user.saved")]
[JsonDerivedType(typeof(UserDeleted), "user.deleted")]
[JsonDerivedType(typeof(SetupCompleted), "setup.completed")]
[JsonDerivedType(typeof(SessionStarted), "session.started")]
[JsonDerivedType(typeof(SessionsEnded), "sessions.ended")]
[JsonDerivedType(typeof(AgentSaved), "agent.saved")]
[JsonDerivedType(typeof(AgentsRemoved), "agents.removed")]
[JsonDerivedType(typeof(CertificateSaved), "certificate.saved")]
[JsonDerivedType(typeof(CertificateDeleted), "certificate.deleted")]
[JsonDerivedType(typeof(AcmeAccountSaved), "acme.account.saved")]
[JsonDerivedType(typeof(AcmeChallengesAdded), "acme.challenges.added")]
[JsonDerivedType(typeof(AcmeChallengesRemoved), "acme.challenges.removed")]
[JsonDerivedType(typeof(LockTaken), "lock.taken")]
[JsonDerivedType(typeof(LockReleased), "lock.released")]
[JsonDerivedType(typeof(AuditRecorded), "audit.recorded")]
[JsonDerivedType(typeof(ClusterCreated), "cluster.created")]
[JsonDerivedType(typeof(ReplicaSaved), "replica.saved")]
[JsonDerivedType(typeof(ReplicaRemoved), "replica.removed")]
[JsonDerivedType(typeof(ClusterRecovered), "cluster.recovered")]
[JsonDerivedType(typeof(MembershipChanged), "membership.changed")]
[JsonDerivedType(typeof(ReplicaApproved), "replica.approved")]
[JsonDerivedType(typeof(ReplicaLeft), "replica.left")]
[JsonDerivedType(typeof(Keys.DataKeyAdded), "data-key.added")]
[JsonDerivedType(typeof(Keys.RootKeyRegistered), "root-key.registered")]
[JsonDerivedType(typeof(Keys.RootKeysForgotten), "root-keys.forgotten")]
[JsonDerivedType(typeof(Trust.ClusterCaAdded), "cluster-ca.added")]
[JsonDerivedType(typeof(Trust.ClusterCaPromoted), "cluster-ca.promoted")]
[JsonDerivedType(typeof(Trust.ClusterCaRetired), "cluster-ca.retired")]
[JsonDerivedType(typeof(BackupExported), "backup.exported")]
[JsonDerivedType(typeof(StateRestored), "state.restored")]
[JsonDerivedType(typeof(SingleSignOn.SsoSettingsSaved), "sso.saved")]
[JsonDerivedType(typeof(Streams.StreamRouteSaved), "stream.saved")]
[JsonDerivedType(typeof(Streams.StreamRouteDeleted), "stream.deleted")]
[JsonDerivedType(typeof(AdminCertificateSaved), "admin-certificate.saved")]
[JsonDerivedType(typeof(SessionPolicySaved), "session-policy.saved")]
[JsonDerivedType(typeof(RouteDefaultsSaved), "route-defaults.saved")]
[JsonDerivedType(typeof(AgentPolicySaved), "agent-policy.saved")]
[JsonDerivedType(typeof(BrandSaved), "brand.saved")]
[JsonDerivedType(typeof(Stacks.StackSaved), "stack.saved")]
[JsonDerivedType(typeof(Stacks.StackRemoved), "stack.removed")]
[JsonDerivedType(typeof(Stacks.PipelineTokenSaved), "pipeline-token.saved")]
[JsonDerivedType(typeof(Stacks.PipelineTokenRevoked), "pipeline-token.revoked")]
[JsonDerivedType(typeof(Stacks.PipelineTokenUsed), "pipeline-token.used")]
[JsonDerivedType(typeof(Proxies.TrustedProxySaved), "trusted-proxy.saved")]
[JsonDerivedType(typeof(Proxies.TrustedProxyRemoved), "trusted-proxy.removed")]
[JsonDerivedType(typeof(PathRedirectSaved), "path-redirect.saved")]
public interface IStateChange
{
    ApiaryState Apply(ApiaryState state);
}
