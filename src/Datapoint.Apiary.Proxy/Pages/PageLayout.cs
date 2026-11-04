using System.Net;
using Datapoint.Apiary.Cluster.Brands;
using Microsoft.AspNetCore.Http;

namespace Datapoint.Apiary.Proxy.Pages;

public static class PageLayout
{
    public const string Policy = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";
    public const string SignInPolicy = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
    private const string DefaultButton = "background:var(--ink);color:var(--ground)";
    private static readonly Lazy<string> s_tokens = new(() => ReadResource("tokens.css"));
    private static readonly Lazy<string> s_datapointLogo = new(() => ReadResource("datapoint-logo.svg").Replace("<svg ", "<svg style=\"width:88px;height:auto;display:block\" ", StringComparison.Ordinal));

    public static IResult Render(int status, VisitorLanguage language, string title, string body, VisitorBrand? brand, bool poweredBy, string policy = Policy)
    {
        var name = brand is null ? null : WebUtility.HtmlEncode(brand.Name);
        var button = brand is null ? DefaultButton : $"background:{brand.Accent};color:{AccentColors.TextOn(brand.Accent)}";
        return new SecuredPage(Results.Content(
            $$$"""
            <!doctype html>
            <html lang="{{{language.Code}}}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
            <title>{{{(name is null ? title : $"{title} · {name}")}}}</title>
            <style>{{{s_tokens.Value}}}
            body{font:16px/1.5 var(--font-text);margin:0;background:var(--ground);color:var(--ink)}
            .page{display:grid;grid-template-rows:1fr auto;min-height:100vh}.center{display:grid;place-items:center}
            main{width:100%;max-width:26rem;padding:var(--space-6);box-sizing:border-box}h1{font:600 1.5rem/1.25 var(--font-display);margin:0 0 var(--space-2)}p{margin:0;color:var(--ink-2)}
            .brand{display:flex;align-items:center;gap:10px;margin-bottom:var(--space-6);font-weight:600}.brand img{height:32px;width:auto}
            .contact{margin-top:var(--space-6);font-size:.875rem}
            form{display:grid;gap:var(--space-2);margin-top:var(--space-5)}label{font-weight:600;font-size:.875rem}
            input{font:inherit;padding:10px 12px;border-radius:var(--radius-2);border:1px solid var(--line-strong);background:var(--surface);color:var(--ink)}
            button{font:600 1rem/1.5 var(--font-text);margin-top:var(--space-2);padding:10px 16px;border:0;border-radius:var(--radius-2);{{{button}}};cursor:pointer}
            input:disabled,button:disabled{opacity:.5;cursor:not-allowed}:focus-visible{outline:2px solid var(--focus);outline-offset:2px}
            .error{color:var(--critical);font-size:.875rem}.small{margin-top:var(--space-5);font-size:.875rem;color:var(--ink-3)}.data{font-family:var(--font-data);word-break:break-all}
            footer{padding:var(--space-6) var(--space-4) var(--space-8);display:flex;justify-content:center;align-items:center;gap:14px;font-size:.8125rem;color:var(--ink-3)}
            footer .dp{color:var(--ink-2)}footer .sep{width:1px;height:18px;background:var(--line-strong)}
            footer .apiary{display:inline-flex;align-items:center;gap:8px;color:inherit;text-decoration:underline;text-decoration-color:var(--line-strong);text-underline-offset:3px}
            footer .mark{width:16px;height:14px;clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%);background:var(--honey)}</style></head>
            <body><div class="page"><div class="center"><main>{{{BrandRow(brand, name)}}}{{{body}}}{{{Contact(brand)}}}</main></div>{{{(poweredBy ? Footer(language) : "")}}}</div></body></html>
            """,
            "text/html; charset=utf-8",
            statusCode: status), policy);
    }

    private static string BrandRow(VisitorBrand? brand, string? name)
    {
        if (brand is null)
        {
            return "";
        }

        var logo = brand.Logo is { } image ? $"<img src=\"{image.DataUri}\" alt=\"\">" : "";
        return $"<div class=\"brand\" translate=\"no\">{logo}<span>{name}</span></div>";
    }

    private static string Contact(VisitorBrand? brand) =>
        brand?.Contact is { } contact ? $"<p class=\"contact\" translate=\"no\">{WebUtility.HtmlEncode(contact)}</p>" : "";

    private static string Footer(VisitorLanguage language) =>
        $"""
        <footer><a class="dp" href="https://datapoint.software/">{s_datapointLogo.Value}</a><span class="sep" aria-hidden="true"></span>
        <a class="apiary" href="https://apiary.datapoint.software/"><span class="mark" aria-hidden="true"></span>{language.T("Powered by Apiary")}</a></footer>
        """;

    private static string ReadResource(string name)
    {
        using var stream = typeof(PageLayout).Assembly.GetManifestResourceStream(name) ?? throw new InvalidOperationException($"{name} isn't embedded in the assembly.");
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
