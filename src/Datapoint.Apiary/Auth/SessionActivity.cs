using System.Buffers.Binary;
using Datapoint.Apiary.Cluster.Sessions;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Security.Tokens;

namespace Datapoint.Apiary.Auth;

public sealed class SessionActivity(SealedTokens tokens, IClusterState cluster, TimeProvider time)
{
    public const string CookieName = "apiary_activity";
    public const string BackgroundHeader = "X-Apiary-Background";
    private const string Purpose = "apiary/session-activity";
    private const int IdLength = 16;
    private static readonly TimeSpan s_refreshAfter = TimeSpan.FromMinutes(1);

    public bool HasExpired(HttpContext context, Session session)
    {
        var now = time.GetUtcNow();
        var last = Read(context, session) ?? session.StartedAt;
        if (now - last > SessionPolicy.IdleTimeout(cluster.Current))
        {
            context.Response.Cookies.Delete(CookieName, Options(context));
            return true;
        }

        if (now - last < s_refreshAfter || context.Request.Headers.ContainsKey(BackgroundHeader))
        {
            return false;
        }

        context.Response.Cookies.Append(CookieName, Write(session, now), Options(context));
        return false;
    }

    private DateTimeOffset? Read(HttpContext context, Session session)
    {
        if (!context.Request.Cookies.TryGetValue(CookieName, out var cookie)
            || string.IsNullOrEmpty(cookie)
            || tokens.Open(Purpose, cookie) is not { Length: IdLength + sizeof(long) } payload
            || new Guid(payload.AsSpan(0, IdLength)) != session.Id)
        {
            return null;
        }

        return DateTimeOffset.FromUnixTimeSeconds(BinaryPrimitives.ReadInt64BigEndian(payload.AsSpan(IdLength)));
    }

    private string Write(Session session, DateTimeOffset now)
    {
        var payload = new byte[IdLength + sizeof(long)];
        session.Id.TryWriteBytes(payload);
        BinaryPrimitives.WriteInt64BigEndian(payload.AsSpan(IdLength), now.ToUnixTimeSeconds());
        return tokens.Seal(Purpose, payload);
    }

    private static CookieOptions Options(HttpContext context) => new()
    {
        HttpOnly = true,
        Secure = context.Request.IsHttps,
        SameSite = SameSiteMode.Strict,
        Path = "/",
        IsEssential = true,
    };
}
