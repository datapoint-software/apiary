namespace Datapoint.Apiary.Management.Stacks;

public static class StackNames
{
    public const int MaximumItems = 200;
    public const int MaximumLength = 63;

    public static bool IsStack(string? name) =>
        name is { Length: > 0 and <= MaximumLength }
        && IsLowercaseOrDigit(name[0])
        && name.All(c => IsLowercaseOrDigit(c) || c is '_' or '-');

    public static bool IsLabel(string? name) =>
        name is { Length: > 0 and <= MaximumLength }
        && char.IsAsciiLetterOrDigit(name[0])
        && name.All(c => char.IsAsciiLetterOrDigit(c) || c is '_' or '-' or '.');

    public static string Target(string stack, string service) => $"{stack}_{service}";

    private static bool IsLowercaseOrDigit(char c) => char.IsAsciiLetterLower(c) || char.IsAsciiDigit(c);
}
