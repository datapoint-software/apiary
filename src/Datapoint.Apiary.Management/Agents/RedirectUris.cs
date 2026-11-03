namespace Datapoint.Apiary.Management.Agents;

public static class RedirectUris
{
    private const int MaxLength = 2000;

    public static bool IsAllowed(string? value, IReadOnlyList<string> trustedOrigins) =>
        value is { Length: <= MaxLength }
        && Uri.TryCreate(value, UriKind.Absolute, out var uri)
        && string.IsNullOrEmpty(uri.Fragment)
        && string.IsNullOrEmpty(uri.UserInfo)
        && (IsLoopback(uri) || (uri.Scheme == Uri.UriSchemeHttps && trustedOrigins.Contains(Origin(uri), StringComparer.Ordinal)));

    public static bool IsLoopback(Uri uri) => uri.IsLoopback && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);

    public static string? NormalizeOrigin(string? value) =>
        Uri.TryCreate(value?.Trim(), UriKind.Absolute, out var uri)
        && uri.Scheme == Uri.UriSchemeHttps
        && string.IsNullOrEmpty(uri.UserInfo)
        && uri.AbsolutePath == "/"
        && string.IsNullOrEmpty(uri.Query)
        && string.IsNullOrEmpty(uri.Fragment)
            ? Origin(uri)
            : null;

    public static string WithQuery(string redirectUri, IEnumerable<KeyValuePair<string, string?>> parameters)
    {
        var query = string.Join('&', parameters
            .Where(p => p.Value is not null)
            .Select(p => $"{Uri.EscapeDataString(p.Key)}={Uri.EscapeDataString(p.Value!)}"));
        return string.Concat(redirectUri, redirectUri.Contains('?', StringComparison.Ordinal) ? "&" : "?", query);
    }

    private static string Origin(Uri uri) => uri.GetLeftPart(UriPartial.Authority);
}
