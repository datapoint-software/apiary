using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Proxy.Pages;
using Datapoint.Apiary.Proxy.RateLimits;
using Datapoint.Apiary.Security.Passwords;
using Datapoint.Apiary.Security.Tokens;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Extensions;
using Microsoft.AspNetCore.Http.Features;

namespace Datapoint.Apiary.Proxy.Passwords;

public sealed class PasswordGate(ClientRateLimiter limiter, PublicPages pages, TimeProvider time)
{
    public const string KeyParameter = "apiary-key";
    public const string PasswordField = "apiary-password";
    public const string GateField = "apiary-gate";
    private const int Tries = 5;
    private const long MaximumForm = 4096;
    private static readonly TimeSpan s_tryPeriod = TimeSpan.FromMinutes(5);
    private static readonly FormOptions s_formOptions = new() { ValueCountLimit = 8, KeyLengthLimit = 64, ValueLengthLimit = 1024 };

    public async Task InvokeAsync(HttpContext context, Route route, RoutePassword password, RequestDelegate next)
    {
        if (!context.Request.IsHttps)
        {
            await pages.SecureOnly(route).ExecuteAsync(context);
            return;
        }

        var now = time.GetUtcNow();
        var key = context.Request.Query[KeyParameter].ToString();
        if (PasswordCookie.IsValid(context.Request.Cookies[PasswordCookie.Name(route.Id)], route.Id, password, now))
        {
            await PassAsync(context, key, next);
            return;
        }

        var form = await ReadGateFormAsync(context);
        if (form?.ContainsKey(PasswordField) == true)
        {
            await SignInAsync(context, route, password, form[PasswordField].ToString(), now);
            return;
        }

        if (key.Length > 0)
        {
            await OpenLinkAsync(context, route, password, key, submitted: form is not null, now);
            return;
        }

        await pages.Password(route, password, PasswordProblem.None).ExecuteAsync(context);
    }

    private static Task PassAsync(HttpContext context, string key, RequestDelegate next)
    {
        if (key.Length > 0 && (HttpMethods.IsGet(context.Request.Method) || HttpMethods.IsHead(context.Request.Method)))
        {
            return SeeOtherAsync(context);
        }

        return next(context);
    }

    private async Task SignInAsync(HttpContext context, Route route, RoutePassword password, string given, DateTimeOffset now)
    {
        if (given.Length == 0)
        {
            await pages.Password(route, password, PasswordProblem.Empty).ExecuteAsync(context);
            return;
        }

        if (!limiter.TryAcquire("password:" + route.Id.ToString("N"), context.Connection.RemoteIpAddress, Tries, s_tryPeriod, out _))
        {
            context.Response.Headers.RetryAfter = ((long)s_tryPeriod.TotalSeconds).ToString(CultureInfo.InvariantCulture);
            await pages.Password(route, password, PasswordProblem.TooManyTries).ExecuteAsync(context);
            return;
        }

        if (!PasswordHasher.Verify(given, password.Hash))
        {
            await pages.Password(route, password, PasswordProblem.Wrong).ExecuteAsync(context);
            return;
        }

        await SignedInAsync(context, route, password, now);
    }

    private async Task OpenLinkAsync(HttpContext context, Route route, RoutePassword password, string key, bool submitted, DateTimeOffset now)
    {
        if (!Matches(password.Link, key))
        {
            await pages.Password(route, password, PasswordProblem.LinkExpired).ExecuteAsync(context);
            return;
        }

        if (!submitted)
        {
            await pages.SignInLink(route, password).ExecuteAsync(context);
            return;
        }

        await SignedInAsync(context, route, password, now);
    }

    private static Task SignedInAsync(HttpContext context, Route route, RoutePassword password, DateTimeOffset now)
    {
        var expires = now.AddDays(password.Days);
        context.Response.Cookies.Append(PasswordCookie.Name(route.Id), PasswordCookie.Create(route.Id, password, expires), new CookieOptions
        {
            Path = "/",
            Secure = true,
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Expires = expires,
            IsEssential = true,
        });
        return SeeOtherAsync(context);
    }

    private static Task SeeOtherAsync(HttpContext context)
    {
        var request = context.Request;
        var query = QueryString.Create(request.Query.Where(q => q.Key != KeyParameter));
        context.Response.StatusCode = StatusCodes.Status303SeeOther;
        context.Response.Headers.Location = UriHelper.BuildAbsolute("https", request.Host, request.PathBase, request.Path, query);
        context.Response.Headers.CacheControl = "no-store";
        return Task.CompletedTask;
    }

    private static bool Matches(RouteLink? link, string key) =>
        link is not null && CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(SecretTokens.Hash(key)), Encoding.ASCII.GetBytes(link.KeyHash));

    private static async Task<IFormCollection?> ReadGateFormAsync(HttpContext context)
    {
        var request = context.Request;
        if (!HttpMethods.IsPost(request.Method) || !request.HasFormContentType || request.ContentLength is not (> 0 and <= MaximumForm))
        {
            return null;
        }

        try
        {
            var form = await request.ReadFormAsync(s_formOptions, context.RequestAborted);
            return form.ContainsKey(GateField) ? form : null;
        }
        catch (InvalidDataException)
        {
            return null;
        }
    }
}
