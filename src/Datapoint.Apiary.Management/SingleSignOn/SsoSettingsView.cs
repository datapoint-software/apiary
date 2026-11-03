using Datapoint.Apiary.Cluster.SingleSignOn;

namespace Datapoint.Apiary.Management.SingleSignOn;

public sealed record SsoSettingsView(
    bool Enabled,
    string DisplayName,
    string Issuer,
    string ClientId,
    bool HasClientSecret,
    string GroupsClaim,
    IReadOnlyList<string> AdministratorGroups,
    IReadOnlyList<string> OperatorGroups,
    IReadOnlyList<string> ViewerGroups,
    DateTimeOffset? ChangedAt)
{
    public static SsoSettingsView From(SsoSettings? settings) => settings is null
        ? new(false, string.Empty, string.Empty, string.Empty, false, SsoRules.DefaultGroupsClaim, [], [], [], null)
        : new(
            settings.Enabled,
            settings.DisplayName,
            settings.Issuer,
            settings.ClientId,
            !string.IsNullOrEmpty(settings.ClientSecret),
            settings.GroupsClaim,
            settings.AdministratorGroups,
            settings.OperatorGroups,
            settings.ViewerGroups,
            settings.ChangedAt);
}
