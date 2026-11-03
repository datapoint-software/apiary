namespace Datapoint.Apiary.Cluster.SingleSignOn;

public sealed record SsoSettings(
    bool Enabled,
    string DisplayName,
    string Issuer,
    string ClientId,
    string? ClientSecret,
    string GroupsClaim,
    IReadOnlyList<string> AdministratorGroups,
    IReadOnlyList<string> OperatorGroups,
    IReadOnlyList<string> ViewerGroups,
    DateTimeOffset ChangedAt);
