using Datapoint.Apiary.Stacks;

namespace Datapoint.Apiary.Tests.Stacks;

public sealed class LabelInterpolationTests
{
    private static readonly Dictionary<string, string> s_environment = new(StringComparer.Ordinal) { ["HOST"] = "shop.example.com", ["EMPTY"] = "" };

    [Theory]
    [InlineData("${HOST}", "shop.example.com")]
    [InlineData("$HOST/path", "shop.example.com/path")]
    [InlineData("${MISSING}", "")]
    [InlineData("${MISSING:-fallback}", "fallback")]
    [InlineData("${EMPTY:-fallback}", "fallback")]
    [InlineData("${EMPTY-fallback}", "")]
    [InlineData("${MISSING-fallback}", "fallback")]
    [InlineData("$$HOST", "$HOST")]
    [InlineData("cost $5", "cost $5")]
    [InlineData("ends with $", "ends with $")]
    [InlineData("${UNCLOSED", "${UNCLOSED")]
    public void Variables_are_replaced_like_docker_compose_replaces_them(string value, string expected) =>
        Assert.Equal(expected, LabelInterpolation.Apply(value, s_environment.GetValueOrDefault));
}
