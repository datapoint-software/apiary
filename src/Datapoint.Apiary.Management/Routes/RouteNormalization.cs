namespace Datapoint.Apiary.Management.Routes;

public static class RouteNormalization
{
    public static string Host(string host) => host.Trim().ToLowerInvariant();

    public static string Path(string path)
    {
        var trimmed = path.Trim();
        return trimmed.Length > 1 ? trimmed.TrimEnd('/') : trimmed;
    }
}
