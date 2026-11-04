using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Security.Tokens;

namespace Datapoint.Apiary.Proxy.Passwords;

public static class PasswordCookie
{
    public const string Prefix = "__Host-apiary-pass-";

    public static string Name(Guid routeId) => Prefix + routeId.ToString("N");

    public static string Create(Guid routeId, RoutePassword password, DateTimeOffset expires)
    {
        var seconds = expires.ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture);
        return seconds + "." + Sign(routeId, password, seconds);
    }

    public static bool IsValid(string? value, Guid routeId, RoutePassword password, DateTimeOffset now)
    {
        if (value?.Split('.') is not [var seconds, var signature]
            || !long.TryParse(seconds, NumberStyles.None, CultureInfo.InvariantCulture, out var expires)
            || expires <= now.ToUnixTimeSeconds())
        {
            return false;
        }

        return CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(signature), Encoding.ASCII.GetBytes(Sign(routeId, password, seconds)));
    }

    private static string Sign(Guid routeId, RoutePassword password, string seconds)
    {
        var key = Base64Url.TryDecode(password.CookieKey) ?? [];
        return Base64Url.Encode(HMACSHA256.HashData(key, Encoding.ASCII.GetBytes(routeId.ToString("N") + "." + seconds)));
    }
}
