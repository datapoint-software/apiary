namespace Datapoint.Apiary.Management.SingleSignOn;

public static class SsoRules
{
    public const string DefaultGroupsClaim = "groups";
    public const int MaximumDisplayName = 40;
    public const int MaximumIssuer = 500;
    public const int MaximumClientId = 200;
    public const int MaximumClientSecret = 500;
    public const int MaximumGroups = 50;
    public const int MaximumGroup = 200;

    public static bool IsIssuer(string issuer, bool allowHttp) =>
        Uri.TryCreate(issuer, UriKind.Absolute, out var uri)
        && (uri.Scheme == Uri.UriSchemeHttps || (allowHttp && uri.Scheme == Uri.UriSchemeHttp))
        && string.IsNullOrEmpty(uri.Query)
        && string.IsNullOrEmpty(uri.Fragment)
        && string.IsNullOrEmpty(uri.UserInfo);

    public static IReadOnlyList<string> Clean(IReadOnlyList<string>? groups) =>
        [.. (groups ?? []).Select(g => g.Trim()).Where(g => g.Length > 0).Distinct(StringComparer.Ordinal)];
}
