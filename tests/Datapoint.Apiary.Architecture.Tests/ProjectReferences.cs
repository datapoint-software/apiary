using System.Xml.Linq;
using Datapoint.Apiary.Testing;

namespace Datapoint.Apiary.Architecture.Tests;

public static class ProjectReferences
{
    public static IReadOnlyList<string> Of(string project) =>
        [.. XDocument.Load(Repository.PathTo("src", project, project + ".csproj"))
            .Descendants("ProjectReference")
            .Select(reference => Path.GetFileNameWithoutExtension(reference.Attribute("Include")!.Value.Replace('\\', '/')))
            .Order(StringComparer.Ordinal)];

    public static IReadOnlyList<string> Referencing(string project) =>
        [.. Directory.GetFiles(Repository.PathTo("src"), "*.csproj", SearchOption.AllDirectories)
            .Select(Path.GetFileNameWithoutExtension)
            .OfType<string>()
            .Where(other => Of(other).Contains(project, StringComparer.Ordinal))
            .Order(StringComparer.Ordinal)];
}
