namespace Datapoint.Apiary.Security.Tokens;

public static class Base64Url
{
    public static string Encode(ReadOnlySpan<byte> data) => System.Buffers.Text.Base64Url.EncodeToString(data);

    public static byte[]? TryDecode(string text)
    {
        try
        {
            return System.Buffers.Text.Base64Url.DecodeFromChars(text);
        }
        catch (FormatException)
        {
            return null;
        }
    }
}
