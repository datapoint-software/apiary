using System.Net;
using System.Net.Sockets;

namespace Datapoint.Apiary.Management.Validation;

public static class HostnameRules
{
    public const int MaximumLength = 253;
    private const int MaximumLabelLength = 63;

    public static bool HasNoScheme(string hostname) =>
        !hostname.StartsWith("http://", StringComparison.OrdinalIgnoreCase) && !hostname.StartsWith("https://", StringComparison.OrdinalIgnoreCase);

    public static bool HasNoPath(string hostname) => !hostname.Contains('/', StringComparison.Ordinal) && !hostname.Contains(':', StringComparison.Ordinal);

    public static bool IsNotAddress(string hostname) =>
        !(IPAddress.TryParse(hostname, out var address) && address.AddressFamily == AddressFamily.InterNetwork);

    public static bool IsFull(string hostname) => hostname.Contains('.', StringComparison.Ordinal);

    public static bool HasNoConsecutiveDots(string hostname) => !hostname.Split('.').Any(label => label.Length == 0);

    public static bool HasOnlyAllowedCharacters(string hostname) => hostname.All(IsAllowed);

    public static bool HasOnlyServiceNameCharacters(string name) => name.All(character => IsAllowed(character) || character is '_');

    public static bool HasValidLabels(string hostname) => hostname.Split('.').All(IsValidLabel);

    private static bool IsAllowed(char character) =>
        char.IsAsciiLetter(character) || char.IsAsciiDigit(character) || character is '-' or '.';

    private static bool IsValidLabel(string label) =>
        label.Length <= MaximumLabelLength && !label.StartsWith('-') && !label.EndsWith('-');
}
