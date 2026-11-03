using System.Globalization;
using System.Net;
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

    private const string Policy = "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

    private static SecuredPage Page(int status, string title, string heading, string text) => new SecuredPage(Results.Content(
        $$$"""
        <!doctype html>
        <html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
        <title>{{{title}}}</title>
        <style>{{{s_tokens.Value}}}
        body{font:16px/1.5 var(--font-text);margin:0;display:grid;place-items:center;min-height:100vh;background:var(--ground);color:var(--ink)}
        main{max-width:32rem;padding:var(--space-6)}h1{font:600 1.5rem/1.25 var(--font-display);margin:0 0 var(--space-2)}p{margin:0;color:var(--ink-2)}</style></head>
        <body><main><h1>{{{heading}}}</h1><p>{{{text}}}</p></main></body></html>
        """,
        "text/html; charset=utf-8",
        statusCode: status));

    private static string ReadTokens()
    {
        using var stream = typeof(PublicPages).Assembly.GetManifestResourceStream("tokens.css") ?? throw new InvalidOperationException("tokens.css isn't embedded in the assembly.");
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }

    private sealed class SecuredPage(IResult page) : IResult
    {
        public Task ExecuteAsync(HttpContext httpContext)
        {
            httpContext.Response.Headers.ContentSecurityPolicy = Policy;
            httpContext.Response.Headers.XContentTypeOptions = "nosniff";
            return page.ExecuteAsync(httpContext);
        }
    }
}
