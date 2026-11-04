using System.Globalization;

namespace Datapoint.Apiary.Proxy.Pages;

public static class AccentColors
{
    public const string White = "#FFFFFF";
    public const string Black = "#111111";
    private static readonly int[] s_channelOffsets = [1, 3, 5];

    public static string TextOn(string accent) => Contrast(accent, White) >= Contrast(accent, Black) ? White : Black;

    private static double Contrast(string first, string second)
    {
        var (a, b) = (Luminance(first), Luminance(second));
        return (Math.Max(a, b) + 0.05) / (Math.Min(a, b) + 0.05);
    }

    private static double Luminance(string hex)
    {
        var channels = s_channelOffsets
            .Select(i => int.Parse(hex.AsSpan(i, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture) / 255.0)
            .Select(v => v <= 0.03928 ? v / 12.92 : Math.Pow((v + 0.055) / 1.055, 2.4))
            .ToArray();
        return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
    }
}
