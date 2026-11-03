using Datapoint.Apiary.Cluster.Routes;

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

    public static string Path(string path)
    {
        var trimmed = path.Trim();
        return trimmed.Length > 1 ? trimmed.TrimEnd('/') : trimmed;
    }
}
