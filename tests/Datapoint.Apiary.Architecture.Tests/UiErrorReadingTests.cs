using System.Text.RegularExpressions;
using Datapoint.Apiary.Testing;

namespace Datapoint.Apiary.Architecture.Tests;

public sealed partial class UiErrorReadingTests
{
    public static TheoryData<string> Sources { get; } =
        [.. Directory.GetFiles(Repository.PathTo("src", "web", "projects"), "*.ts", SearchOption.AllDirectories)
            .Where(file => !file.Contains("node_modules", StringComparison.Ordinal))
            .Select(file => Path.GetRelativePath(Repository.Root, file))];

    [Fact]
    public void The_UI_s_problem_type_has_no_title_or_detail() =>
        Assert.DoesNotMatch(TitleOrDetailMember(), Repository.Read("src", "web", "projects", "apiary-ui", "src", "lib", "field", "api-problem.ts"));

    [Theory]
    [MemberData(nameof(Sources))]
    public void No_UI_code_reads_an_error_response_s_title_or_detail(string file) =>
        Assert.DoesNotMatch(ErrorTitleOrDetail(), Repository.Read(file));

    [GeneratedRegex(@"\b(title|detail)\??:", RegexOptions.ExplicitCapture, matchTimeoutMilliseconds: 1000)]
    private static partial Regex TitleOrDetailMember();

    [GeneratedRegex(@"\berror\??\.(title|detail)\b|\berror\??\[\s*'(title|detail)'\s*\]", RegexOptions.ExplicitCapture, matchTimeoutMilliseconds: 1000)]
    private static partial Regex ErrorTitleOrDetail();
}
