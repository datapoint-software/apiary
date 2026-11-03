namespace Datapoint.Apiary.Management.Projects;

public static class ProjectIcons
{
    public const string Default = "folder";

    public static IReadOnlySet<string> All { get; } = new HashSet<string>(StringComparer.Ordinal)
    {
        "folder", "shopping-bag", "credit-card", "wrench", "archive", "megaphone",
        "globe", "server", "database", "cloud", "boxes", "flask-conical", "heart-pulse",
    };
}
