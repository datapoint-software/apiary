using System.Collections.Frozen;
using System.Globalization;
using Microsoft.AspNetCore.Http;

namespace Datapoint.Apiary.Proxy.Pages;

public sealed class VisitorLanguage
{
    public static readonly VisitorLanguage English = new("en", FrozenDictionary<string, string>.Empty);
    public static readonly VisitorLanguage Portuguese = new("pt-PT", VisitorCatalogs.Portuguese);

    private readonly FrozenDictionary<string, string> _catalog;

    private VisitorLanguage(string code, FrozenDictionary<string, string> catalog)
    {
        Code = code;
        _catalog = catalog;
    }

    public string Code { get; }

    public static VisitorLanguage From(HttpRequest request)
    {
        var accepted = request.GetTypedHeaders().AcceptLanguage
            .Where(language => language.Quality is null or > 0)
            .OrderByDescending(language => language.Quality ?? 1);
        foreach (var language in accepted)
        {
            var tag = language.Value.Value ?? "";
            if (tag.Equals("pt", StringComparison.OrdinalIgnoreCase) || tag.StartsWith("pt-", StringComparison.OrdinalIgnoreCase))
            {
                return Portuguese;
            }

            if (tag.Equals("en", StringComparison.OrdinalIgnoreCase) || tag.StartsWith("en-", StringComparison.OrdinalIgnoreCase))
            {
                return English;
            }
        }

        return English;
    }

    public string T(string text) => _catalog.GetValueOrDefault(text, text);

    public string T(string text, params object[] values) => string.Format(CultureInfo.InvariantCulture, T(text), values);
}
