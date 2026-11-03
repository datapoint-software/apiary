using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.SingleSignOn;

[Action("sso.update", Description = "Changes how people sign in through your identity provider, using OpenID Connect.")]
[RequiresRole(Role.Administrator)]
public sealed record UpdateSsoSettings(
    [property: Description("Whether the sign-in page offers single sign-on.")] bool Enabled,
    [property: Description("The provider's name on the sign-in button, such as Entra ID.")] string DisplayName,
    [property: Description("The provider's issuer URL, where /.well-known/openid-configuration is found.")] string Issuer,
    [property: Description("The client id Apiary is registered with at the provider.")] string ClientId,
    [property: Description("The client secret. Leave it empty to keep the current one.")] string? ClientSecret,
    [property: Description("The ID token claim that lists the person's groups. Usually groups.")] string GroupsClaim,
    [property: Description("Groups whose members are Administrators.")] IReadOnlyList<string> AdministratorGroups,
    [property: Description("Groups whose members are Operators.")] IReadOnlyList<string> OperatorGroups,
    [property: Description("Groups whose members are Viewers.")] IReadOnlyList<string> ViewerGroups) : ICommand;
