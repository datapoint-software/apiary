using System.Globalization;
using System.Net;
using Datapoint.Apiary.Cluster.Brands;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Proxy.Passwords;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace Datapoint.Apiary.Proxy.Pages;

public sealed class PublicPages(IClusterState cluster, IOptions<VisitorPageOptions> options)
{
    public IResult NotFound() => Page(
        StatusCodes.Status404NotFound,
        "Not found",
        "There's nothing here",
        "No site is set up at this address. If you expected one, check the address, or contact whoever runs it.");

    public IResult Starting() => Page(
        StatusCodes.Status503ServiceUnavailable,
        "Starting",
        "This server is starting",
        "It isn't ready to serve this site yet. Try again in a minute.",
        brand: null);

    public IResult Disabled() => Page(
        StatusCodes.Status503ServiceUnavailable,
        "Unavailable",
        "This site is unavailable",
        "It's turned off for now. If you expected it to work, contact whoever runs it.");

    public IResult Forbidden() => Page(
        StatusCodes.Status403Forbidden,
        "Not allowed",
        "You can't open this site from here",
        "It only accepts visitors from certain networks. If you need it, contact whoever runs it.");

    public IResult TooManyRequests() => Page(
        StatusCodes.Status429TooManyRequests,
        "Too many requests",
        "Too many requests",
        "This site got too many requests from your network. Wait a moment, then try again.");

    public IResult Maintenance(Route route, MaintenanceWindow window) => new VisitorPage(language =>
    {
        var text = window.Message is { } message
            ? WebUtility.HtmlEncode(message)
            : language.T("This site is being worked on. Try again after {0} UTC.", window.End.ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture));
        return Render(StatusCodes.Status503ServiceUnavailable, language, "Maintenance", $"<h1>{language.T("Down for maintenance")}</h1><p>{text}</p>", BrandOf(route));
    });

    public IResult SecureOnly(Route route) => Page(
        StatusCodes.Status503ServiceUnavailable,
        "Not ready",
        "This site needs a secure connection",
        "It asks for a password, which is only sent over HTTPS, and HTTPS isn't ready for this address yet. Try again in a few minutes.",
        BrandOf(route));

    public IResult Password(Route route, RoutePassword password, PasswordProblem problem) => new VisitorPage(language =>
    {
        var text = problem == PasswordProblem.LinkExpired
            ? language.T("This sign-in link no longer works. Enter the password, or ask whoever sent it for a new link.")
            : password.Message is { } message ? WebUtility.HtmlEncode(message) : language.T("Enter the password you were given.");
        var error = PasswordError(problem) is { } english ? language.T(english) : null;
        var locked = problem == PasswordProblem.TooManyTries ? " disabled" : "";
        var invalid = error is null ? "" : " aria-invalid=\"true\" aria-describedby=\"error\"";
        var alert = error is null ? "" : $"<p id=\"error\" class=\"error\" role=\"alert\">{error}</p>";
        return Render(
            problem == PasswordProblem.TooManyTries ? StatusCodes.Status429TooManyRequests : StatusCodes.Status401Unauthorized,
            language,
            "Password",
            $"""
            <h1>{language.T("Restricted access")}</h1><p>{text}</p>
            <form method="post" novalidate><input type="hidden" name="{PasswordGate.GateField}" value="1">
            <label for="password">{language.T("Password")}</label>
            <input id="password" name="{PasswordGate.PasswordField}" type="password" autocomplete="current-password" required autofocus{invalid}{locked}>
            {alert}<button type="submit"{locked}>{language.T("Continue")}</button></form>
            <p class="small">{StaySignedIn(language, password.Days)} {language.T("No password? Ask whoever sent you the link.")}</p>
            """,
            BrandOf(route),
            PageLayout.SignInPolicy);
    });

    public IResult SignInLink(Route route, RoutePassword password) => new VisitorPage(language =>
    {
        var host = WebUtility.HtmlEncode(route.Host);
        var text = password.Message is { } message ? WebUtility.HtmlEncode(message) : language.T("Someone shared this site with you.");
        return PageLayout.Render(
            StatusCodes.Status200OK,
            language,
            host,
            $"""
            <h1 class="data">{host}</h1><p>{text}</p>
            <form method="post"><input type="hidden" name="{PasswordGate.GateField}" value="1"><button type="submit">{language.T("Continue")}</button></form>
            <p class="small">{StaySignedIn(language, password.Days)}</p>
            """,
            BrandOf(route),
            options.Value.ShowPoweredBy,
            PageLayout.SignInPolicy);
    });

    private static string? PasswordError(PasswordProblem problem) => problem switch
    {
        PasswordProblem.Empty => "Enter the password.",
        PasswordProblem.Wrong => "That password isn't right. Check it, or ask whoever sent you the link.",
        PasswordProblem.TooManyTries => "Too many tries from your network. Wait 5 minutes, then try again.",
        _ => null,
    };

    private static string StaySignedIn(VisitorLanguage language, int days) => days == 1
        ? language.T("You stay signed in on this browser for 1 day.")
        : language.T("You stay signed in on this browser for {0} days.", days);

    private VisitorPage Page(int status, string title, string heading, string text) => Page(status, title, heading, text, cluster.Current.Brand);

    private VisitorPage Page(int status, string title, string heading, string text, VisitorBrand? brand) => new VisitorPage(language =>
        Render(status, language, title, $"<h1>{language.T(heading)}</h1><p>{language.T(text)}</p>", brand));

    private IResult Render(int status, VisitorLanguage language, string title, string body, VisitorBrand? brand, string policy = PageLayout.Policy) =>
        PageLayout.Render(status, language, language.T(title), body, brand, options.Value.ShowPoweredBy, policy);

    private VisitorBrand? BrandOf(Route route)
    {
        var state = cluster.Current;
        return state.Projects.TryGetValue(route.ProjectId, out var project) && project.Brand is { } brand ? brand : state.Brand;
    }
}
