using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.SingleSignOn;

[Action("sso.get", "Shows how people sign in through your identity provider. The client secret is never returned.")]
[Api]
[RequiresRole(Role.Administrator)]
public sealed record GetSsoSettings : IQuery<SsoSettingsView>;
