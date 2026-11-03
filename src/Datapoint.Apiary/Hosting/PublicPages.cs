namespace Datapoint.Apiary.Hosting;

public static class PublicPages
{
    private const string NotFoundHtml = """
        <!doctype html>
        <html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Not found</title>
        <style>body{font:16px/1.5 system-ui,sans-serif;margin:0;display:grid;place-items:center;min-height:100vh;background:#faf8f3;color:#1d1b16}
        main{max-width:32rem;padding:24px}h1{font-size:1.5rem;margin:0 0 8px}p{margin:0;color:#5f5a4f}
        @media (prefers-color-scheme:dark){body{background:#16140f;color:#f3efe6}p{color:#b3ad9f}}</style></head>
        <body><main><h1>There's nothing here</h1><p>No site is set up at this address. If you expected one, check the address, or contact whoever runs it.</p></main></body></html>
        """;

    public static IResult NotFound() => Results.Content(NotFoundHtml, "text/html; charset=utf-8", statusCode: StatusCodes.Status404NotFound);
}
