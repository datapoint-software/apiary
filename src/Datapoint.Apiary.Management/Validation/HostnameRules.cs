namespace Datapoint.Apiary.Management.Validation;

public static class HostnameRules
{
    public const int MaximumLength = 253;
    private const int MaximumLabelLength = 63;

    public static bool HasNoConsecutiveDots(string hostname) => !hostname.Contains("..", StringComparison.Ordinal);

    public static bool HasOnlyAllowedCharacters(string hostname) => hostname.All(IsAllowed);

    public static bool HasValidLabels(string hostname) => hostname.Split('.').All(IsValidLabel);

    private static bool IsAllowed(char character) =>
        char.IsAsciiLetter(character) || char.IsAsciiDigit(character) || character is '-' or '.';

    private static bool IsValidLabel(string label) =>
        label.Length is > 0 and <= MaximumLabelLength && !label.StartsWith('-') && !label.EndsWith('-');
}
