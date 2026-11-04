using System.Text;
using Datapoint.Apiary.Cluster.Brands;
using Datapoint.Apiary.Management.Errors;

namespace Datapoint.Apiary.Management.Brands;

public static class BrandLogos
{
    public const int MaximumBytes = 100 * 1024;
    private const string Base64Marker = ";base64,";
    private static readonly string[] s_types = ["image/png", "image/webp", "image/svg+xml"];

    public static bool IsColor(string? color) =>
        color?.Trim() is { Length: 7 } hex && hex[0] == '#' && hex[1..].All(char.IsAsciiHexDigit);

    public static string? Problem(string dataUri)
    {
        if (!TryDecode(dataUri, out var type, out var bytes))
        {
            return ErrorCodes.BrandLogoType;
        }

        if (bytes.Length > MaximumBytes)
        {
            return ErrorCodes.BrandLogoTooLarge;
        }

        return Matches(type, bytes) ? null : ErrorCodes.BrandLogoInvalid;
    }

    public static BrandLogo? Parse(string? dataUri, string? fileName)
    {
        if (dataUri is null || !TryDecode(dataUri, out var type, out var bytes))
        {
            return null;
        }

        var name = string.IsNullOrWhiteSpace(fileName) ? null : fileName.Trim();
        return new BrandLogo(type, Convert.ToBase64String(bytes), name);
    }

    private static bool TryDecode(string dataUri, out string type, out byte[] bytes)
    {
        type = "";
        bytes = [];
        var marker = dataUri.IndexOf(Base64Marker, StringComparison.Ordinal);
        if (!dataUri.StartsWith("data:", StringComparison.Ordinal) || marker < 0)
        {
            return false;
        }

        type = dataUri[5..marker].ToLowerInvariant();
        if (!s_types.Contains(type))
        {
            return false;
        }

        try
        {
            bytes = Convert.FromBase64String(dataUri[(marker + Base64Marker.Length)..]);
            return true;
        }
        catch (FormatException)
        {
            return false;
        }
    }

    private static bool Matches(string type, byte[] bytes) => type switch
    {
        "image/png" => bytes.AsSpan().StartsWith((byte[])[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
        "image/webp" => bytes.Length > 12 && bytes.AsSpan(0, 4).SequenceEqual("RIFF"u8) && bytes.AsSpan(8, 4).SequenceEqual("WEBP"u8),
        _ => IsSvg(bytes),
    };

    private static bool IsSvg(byte[] bytes)
    {
        var text = Encoding.UTF8.GetString(bytes).TrimStart('﻿', ' ', '\t', '\r', '\n');
        return (text.StartsWith("<svg", StringComparison.Ordinal) || text.StartsWith("<?xml", StringComparison.Ordinal))
            && text.Contains("<svg", StringComparison.Ordinal)
            && !text.Contains("<!DOCTYPE", StringComparison.OrdinalIgnoreCase)
            && !text.Contains("<!ENTITY", StringComparison.OrdinalIgnoreCase);
    }
}
