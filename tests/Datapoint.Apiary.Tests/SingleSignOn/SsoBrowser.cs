using System.Net;
using Datapoint.Apiary.Cluster.SingleSignOn;
using Datapoint.Apiary.SingleSignOn;
using Datapoint.Apiary.Tests.Hosting;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.DependencyInjection;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Tests.SingleSignOn;

internal sealed class SsoBrowser : IAsyncDisposable
{
    public const string SignedIn = "signed in";

    private SsoBrowser(ApiaryApp app, FakeIdentityProvider provider)
    {
        App = app;
        Provider = provider;
        Client = Clients.Admin(app, allowRedirects: false);
    }

    public ApiaryApp App { get; }

    public FakeIdentityProvider Provider { get; }

    public HttpClient Client { get; }

    public static async Task<SsoBrowser> StartAsync(FakeIdentityProvider provider, Func<SsoSettings, SsoSettings>? configure = null)
    {
        var app = await ApiaryApp.StartAsync(() => new ApiaryApp
        {
            TestServices = services => services.AddHttpClient(SsoProviders.ClientName).ConfigurePrimaryHttpMessageHandler(() => provider),
        });
        var settings = SomeSsoSettings() with { Issuer = provider.Issuer.TrimEnd('/'), ClientId = provider.ClientId, ClientSecret = provider.ClientSecret };
        await app.SeedAsync(new SsoSettingsSaved((configure ?? (s => s))(settings)));
        return new SsoBrowser(app, provider);
    }

    public async Task<Uri> StartSignInAsync(string next = "/")
    {
        using var response = await Client.GetAsync(new Uri("/auth/sso/start?next=" + Uri.EscapeDataString(next), UriKind.Relative), TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        return response.Headers.Location!;
    }

    public async Task<string> ReturnAsync(Uri callback)
    {
        using var response = await Client.GetAsync(new Uri(callback.PathAndQuery, UriKind.Relative), TestContext.Current.CancellationToken);
        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        return response.StatusCode switch
        {
            HttpStatusCode.OK => SignedIn + " at " + Destination(body),
            HttpStatusCode.Redirect => QueryHelpers.ParseQuery(new Uri(Client.BaseAddress!, response.Headers.Location!).Query)["error"].ToString(),
            _ => $"{(int)response.StatusCode}: {body}",
        };
    }

    public async Task<string> SignInAsync(IReadOnlyDictionary<string, object?> claims, string next = "/") =>
        await ReturnAsync(Provider.Authorize(await StartSignInAsync(next), claims));

    public async ValueTask DisposeAsync()
    {
        Client.Dispose();
        await App.DisposeAsync();
    }

    private static string Destination(string body)
    {
        const string marker = "url=";
        var start = body.IndexOf(marker, StringComparison.Ordinal) + marker.Length;
        return WebUtility.HtmlDecode(body[start..body.IndexOf('"', start)]);
    }
}
