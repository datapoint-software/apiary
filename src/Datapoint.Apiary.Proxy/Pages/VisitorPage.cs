using Microsoft.AspNetCore.Http;
using Microsoft.Net.Http.Headers;

namespace Datapoint.Apiary.Proxy.Pages;

public sealed class VisitorPage(Func<VisitorLanguage, IResult> render) : IResult
{
    public Task ExecuteAsync(HttpContext httpContext)
    {
        var language = VisitorLanguage.From(httpContext.Request);
        httpContext.Response.Headers.ContentLanguage = language.Code;
        httpContext.Response.Headers.Append(HeaderNames.Vary, HeaderNames.AcceptLanguage);
        return render(language).ExecuteAsync(httpContext);
    }
}
