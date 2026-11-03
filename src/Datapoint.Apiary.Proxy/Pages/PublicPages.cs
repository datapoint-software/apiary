using Microsoft.AspNetCore.Http;

namespace Datapoint.Apiary.Proxy.Pages;

public static class PublicPages
{
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

    private static IResult Page(int status, string title, string heading, string text) => Results.Content(
        $$$"""
        <!doctype html>
        <html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
        <title>{{{title}}}</title>
        <style>body{font:16px/1.5 system-ui,sans-serif;margin:0;display:grid;place-items:center;min-height:100vh;background:#faf8f3;color:#1d1b16}
        main{max-width:32rem;padding:24px}h1{font-size:1.5rem;margin:0 0 8px}p{margin:0;color:#5f5a4f}
        @media (prefers-color-scheme:dark){body{background:#16140f;color:#f3efe6}p{color:#b3ad9f}}</style></head>
        <body><main><h1>{{{heading}}}</h1><p>{{{text}}}</p></main></body></html>
        """,
        "text/html; charset=utf-8",
        statusCode: status);
}
