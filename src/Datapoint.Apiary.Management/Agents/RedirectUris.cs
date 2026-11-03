namespace Datapoint.Apiary.Management.Agents;

public static class RedirectUris
{
    private const int MaxLength = 2000;

    public static bool IsAllowed(string? value) =>
        value is { Length: <= MaxLength }
        && Uri.TryCreate(value, UriKind.Absolute, out var uri)
        && string.IsNullOrEmpty(uri.Fragment)
        && string.IsNullOrEmpty(uri.UserInfo)
        && (uri.Scheme == Uri.UriSchemeHttps || (uri.Scheme == Uri.UriSchemeHttp && uri.IsLoopback));

    public static string WithQuery(string redirectUri, IEnumerable<KeyValuePair<string, string?>> parameters)
    {
        var query = string.Join('&', parameters
            .Where(p => p.Value is not null)
            .Select(p => $"{Uri.EscapeDataString(p.Key)}={Uri.EscapeDataString(p.Value!)}"));
        return string.Concat(redirectUri, redirectUri.Contains('?', StringComparison.Ordinal) ? "&" : "?", query);
    }
}
