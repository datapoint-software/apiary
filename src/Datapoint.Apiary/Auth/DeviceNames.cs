namespace Datapoint.Apiary.Auth;

public static class DeviceNames
{
    private static readonly (string Token, string Name)[] s_browsers =
    [
        ("Edg/", "Edge"), ("OPR/", "Opera"), ("Firefox/", "Firefox"), ("Chrome/", "Chrome"), ("Safari/", "Safari"), ("curl/", "curl"),
    ];

    private static readonly (string Token, string Name)[] s_systems =
    [
        ("iPhone", "iPhone"), ("iPad", "iPad"), ("Android", "Android"), ("Mac OS X", "macOS"), ("Windows", "Windows"), ("Linux", "Linux"),
    ];

    public static string? From(string? userAgent)
    {
        if (string.IsNullOrWhiteSpace(userAgent))
        {
            return null;
        }

        var browser = Find(s_browsers, userAgent) ?? "A browser";
        return Find(s_systems, userAgent) is { } system ? $"{browser} on {system}" : browser;
    }

    private static string? Find((string Token, string Name)[] candidates, string userAgent) =>
        candidates.FirstOrDefault(c => userAgent.Contains(c.Token, StringComparison.Ordinal)).Name;
}
