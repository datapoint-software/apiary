namespace Datapoint.Apiary.Testing;

public static class Repository
{
    private static readonly Lazy<string> s_root = new(FindRoot);

    public static string Root => s_root.Value;

    public static string PathTo(params string[] parts) => Path.Combine([Root, .. parts]);

    public static string Read(params string[] parts) => File.ReadAllText(PathTo(parts));

    private static string FindRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "Datapoint.Apiary.slnx")))
        {
            directory = directory.Parent;
        }

        return directory?.FullName ?? throw new InvalidOperationException("The tests must run inside the repository.");
    }
}
