using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Security.Passwords;
using Datapoint.Apiary.Security.Tokens;

namespace Datapoint.Apiary.Management.Routes;

public static class RouteNormalization
{
    public static string Host(string host) => host.Trim().ToLowerInvariant();

    public static IReadOnlyList<string>? Addresses(IReadOnlyList<string>? addresses)
    {
        var trimmed = (addresses ?? []).Select(a => a.Trim()).Where(a => a.Length > 0).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        return trimmed.Count > 0 ? trimmed : null;
    }

    public static MaintenanceWindow? Maintenance(MaintenanceWindow? window) =>
        window is null ? null : new(window.Start.ToUniversalTime(), window.End.ToUniversalTime(), string.IsNullOrWhiteSpace(window.Message) ? null : window.Message.Trim());

    public static IReadOnlyList<RouteTarget> Targets(IReadOnlyList<RouteTarget> targets) =>
        [.. targets.Select(t => t with { Host = t.Host.Trim().ToLowerInvariant(), Weight = targets.Count == 1 ? 100 : t.Weight })];

    public static RouteCanary? Canary(RouteCanary? canary, int targets) =>
        canary is null || targets < 2 ? null : canary with { Name = canary.Name.Trim(), Value = canary.Value.Trim() };

    public static string Path(string path)
    {
        var trimmed = path.Trim();
        return trimmed.Length > 1 ? trimmed.TrimEnd('/') : trimmed;
    }

    public static RoutePassword? Password(RoutePasswordSettings? settings, RoutePassword? current, DateTimeOffset now, string? by)
    {
        if (settings is null)
        {
            return null;
        }

        var message = string.IsNullOrWhiteSpace(settings.Message) ? null : settings.Message.Trim();
        var link = !settings.Link ? null : settings.NewLinkKey is { } key ? new RouteLink(SecretTokens.Hash(key), now) : current?.Link;
        return settings.NewPassword is { } password
            ? new RoutePassword(PasswordHasher.Hash(password), SecretTokens.New(), now, by, settings.Days, message, link)
            : current! with { Days = settings.Days, Message = message, Link = link };
    }
}
