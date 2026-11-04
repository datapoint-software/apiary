using System.Globalization;
using System.Net;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Proxy.Passwords;
using Microsoft.AspNetCore.Http;

namespace Datapoint.Apiary.Proxy.Pages;

public static class PublicPages
{
    private static readonly Lazy<string> s_tokens = new(ReadTokens);

    public static IResult NotFound() => Page(
        StatusCodes.Status404NotFound,
        "Not found",
        "There's nothing here",
        "No site is set up at this address. If you expected one, check the address, or contact whoever runs it.");

    public static IResult Starting() => Page(
        StatusCodes.Status503ServiceUnavailable,
        "Starting",
        "This server is starting",
        "It isn't ready to serve this site yet. Try again in a minute.");

    public static IResult Disabled() => Page(
        StatusCodes.Status503ServiceUnavailable,
        "Unavailable",
        "This site is unavailable",
        "It's turned off for now. If you expected it to work, contact whoever runs it.");

    public static IResult Forbidden() => Page(
        StatusCodes.Status403Forbidden,
        "Not allowed",
        "You can't open this site from here",
        "It only accepts visitors from certain networks. If you need it, contact whoever runs it.");

    public static IResult TooManyRequests() => Page(
        StatusCodes.Status429TooManyRequests,
        "Too many requests",
        "Too many requests",
        "This site got too many requests from your network. Wait a moment, then try again.");

    public static IResult Maintenance(string? message, DateTimeOffset end) => Page(
        StatusCodes.Status503ServiceUnavailable,
        "Maintenance",
        "Down for maintenance",
        WebUtility.HtmlEncode(message ?? string.Create(CultureInfo.InvariantCulture, $"This site is being worked on. Try again after {end:yyyy-MM-dd HH:mm} UTC.")));

    public static IResult SecureOnly() => Page(
        StatusCodes.Status503ServiceUnavailable,
        "Not ready",
        "This site needs a secure connection",
        "It asks for a password, which is only sent over HTTPS, and HTTPS isn't ready for this address yet. Try again in a few minutes.");

    public static IResult Password(RoutePassword password, PasswordProblem problem)
    {
        var text = problem == PasswordProblem.LinkExpired
            ? "This sign-in link no longer works. Enter the password, or ask whoever sent it for a new link."
            : password.Message is { } message ? WebUtility.HtmlEncode(message) : "Enter the password you were given.";
        var error = problem switch
        {
            PasswordProblem.Empty => "Enter the password.",
            PasswordProblem.Wrong => "That password isn't right. Check it, or ask whoever sent you the link.",
            PasswordProblem.TooManyTries => "Too many tries from your network. Wait 5 minutes, then try again.",
            _ => null,
        };
        var locked = problem == PasswordProblem.TooManyTries ? " disabled" : "";
        var invalid = error is null ? "" : " aria-invalid=\"true\" aria-describedby=\"error\"";
        var alert = error is null ? "" : $"<p id=\"error\" class=\"error\" role=\"alert\">{error}</p>";
        return Document(
            problem == PasswordProblem.TooManyTries ? StatusCodes.Status429TooManyRequests : StatusCodes.Status401Unauthorized,
            "Password",
            $"""
            <h1>Restricted access</h1><p>{text}</p>
            <form method="post" novalidate><input type="hidden" name="{PasswordGate.GateField}" value="1">
            <label for="password">Password</label>
            <input id="password" name="{PasswordGate.PasswordField}" type="password" autocomplete="current-password" required autofocus{invalid}{locked}>
            {alert}<button type="submit"{locked}>Continue</button></form>
            <p class="small">{StaySignedIn(password.Days)} No password? Ask whoever sent you the link.</p>
            """,
            SignInPolicy);
    }

    public static IResult SignInLink(string host, RoutePassword password) => Document(
        StatusCodes.Status200OK,
        WebUtility.HtmlEncode(host),
        $"""
        <h1 class="data">{WebUtility.HtmlEncode(host)}</h1><p>{(password.Message is { } message ? WebUtility.HtmlEncode(message) : "Someone shared this site with you.")}</p>
        <form method="post"><input type="hidden" name="{PasswordGate.GateField}" value="1"><button type="submit">Continue</button></form>
        <p class="small">{StaySignedIn(password.Days)}</p>
        """,
        SignInPolicy);

    private const string Policy = "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

    private const string SignInPolicy = "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";

    private static string StaySignedIn(int days) =>
        string.Create(CultureInfo.InvariantCulture, $"You stay signed in on this browser for {days} {(days == 1 ? "day" : "days")}.");

    private static SecuredPage Page(int status, string title, string heading, string text) =>
        Document(status, title, $"<h1>{heading}</h1><p>{text}</p>", Policy);

    private static SecuredPage Document(int status, string title, string body, string policy) => new(Results.Content(
        $$$"""
        <!doctype html>
        <html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
        <title>{{{title}}}</title>
        <style>{{{s_tokens.Value}}}
        body{font:16px/1.5 var(--font-text);margin:0;display:grid;place-items:center;min-height:100vh;background:var(--ground);color:var(--ink)}
        main{width:100%;max-width:32rem;padding:var(--space-6);box-sizing:border-box}h1{font:600 1.5rem/1.25 var(--font-display);margin:0 0 var(--space-2)}p{margin:0;color:var(--ink-2)}
        form{display:grid;gap:var(--space-2);margin-top:var(--space-5)}label{font-weight:600;font-size:.875rem}
        input{font:inherit;padding:10px 12px;border-radius:var(--radius-2);border:1px solid var(--line-strong);background:var(--surface);color:var(--ink)}
        button{font:600 1rem/1.5 var(--font-text);margin-top:var(--space-2);padding:10px 16px;border:0;border-radius:var(--radius-2);background:var(--ink);color:var(--ground);cursor:pointer}
        input:disabled,button:disabled{opacity:.5;cursor:not-allowed}:focus-visible{outline:2px solid var(--focus);outline-offset:2px}
        .error{color:var(--critical);font-size:.875rem}.small{margin-top:var(--space-5);font-size:.875rem;color:var(--ink-3)}.data{font-family:var(--font-data);word-break:break-all}</style></head>
        <body><main>{{{body}}}</main></body></html>
        """,
        "text/html; charset=utf-8",
        statusCode: status), policy);

    private static string ReadTokens()
    {
        using var stream = typeof(PublicPages).Assembly.GetManifestResourceStream("tokens.css") ?? throw new InvalidOperationException("tokens.css isn't embedded in the assembly.");
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }

    private sealed class SecuredPage(IResult page, string policy) : IResult
    {
        public Task ExecuteAsync(HttpContext httpContext)
        {
            httpContext.Response.Headers.ContentSecurityPolicy = policy;
            httpContext.Response.Headers.XContentTypeOptions = "nosniff";
            if (policy == SignInPolicy)
            {
                httpContext.Response.Headers.CacheControl = "no-store";
                httpContext.Response.Headers["X-Robots-Tag"] = "noindex";
                httpContext.Response.Headers["Referrer-Policy"] = "no-referrer";
            }

            return page.ExecuteAsync(httpContext);
        }
    }
}
