using System.Text.RegularExpressions;
using Datapoint.Apiary.Testing;

namespace Datapoint.Apiary.Architecture.Tests;

public static partial class MessageCatalog
{
    public static IReadOnlySet<string> English { get; } = Keys(
        ["src", "web", "projects", "apiary-ui", "src", "lib", "messages", "default-messages.ts"],
        ["src", "web", "projects", "apiary", "src", "app", "errors", "app-messages.ts"]);

    public static IReadOnlySet<string> Portuguese { get; } = Keys(
        ["src", "web", "projects", "apiary-ui", "src", "lib", "messages", "portuguese-messages.ts"],
        ["src", "web", "projects", "apiary", "src", "app", "errors", "app-messages.pt.ts"]);

    private static HashSet<string> Keys(params string[][] files) =>
        files.SelectMany(file => KeyPattern().Matches(Repository.Read(file)).Select(match => match.Groups["key"].Value))
            .ToHashSet(StringComparer.Ordinal);

    [GeneratedRegex(@"^\s*'?(?<key>[A-Za-z][A-Za-z0-9.\-]*)'?:", RegexOptions.Multiline | RegexOptions.ExplicitCapture, matchTimeoutMilliseconds: 1000)]
    private static partial Regex KeyPattern();
}
