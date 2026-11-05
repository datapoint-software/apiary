using Datapoint.Apiary.Cluster.Redirects;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Routes;
using Datapoint.Apiary.Management.Validation;
using FluentValidation;

namespace Datapoint.Apiary.Management.Redirects;

public static class RedirectRules
{
    public const int MaximumTargetLength = 2048;
    private const string AcmeChallenges = "/.well-known/acme-challenge";
    private static readonly int[] s_statusCodes = [301, 302, 307, 308];

    public static bool IsStatusCode(int code) => s_statusCodes.Contains(code);

    public static IRuleBuilderOptions<T, string> RedirectPath<T>(this IRuleBuilderInitial<T, string> rule) =>
        rule.Path().Must(path => !IsReserved(path)).WithErrorCode(ErrorCodes.RedirectPathReserved);

    public static IRuleBuilderOptions<T, string> RedirectTarget<T>(this IRuleBuilderInitial<T, string> rule, Func<T, string> from, Func<T, string?> path) =>
        rule.Cascade(CascadeMode.Stop)
            .NotEmpty().WithErrorCode(ErrorCodes.Required)
            .MaximumLength(MaximumTargetLength).WithErrorCode(ErrorCodes.TooLong)
            .Must(IsTarget).WithErrorCode(ErrorCodes.RedirectTargetInvalid)
            .Must((r, to) => Absolute(to) is not null || !IsWholeHost(path(r))).WithErrorCode(ErrorCodes.RedirectRelativeNeedsPath)
            .Must((r, to) => !IsLoop(from(r), path(r), to)).WithErrorCode(ErrorCodes.RedirectLoop);

    public static string Path(string? path) => string.IsNullOrWhiteSpace(path) ? Redirect.WholeHost : RouteNormalization.Path(path);

    public static bool IsWholeHost(string? path) => Path(path) == Redirect.WholeHost;

    public static string Label(Redirect redirect) => redirect.Path == Redirect.WholeHost ? redirect.From : redirect.From + redirect.Path;

    public static bool IsUnder(string path, string prefix) =>
        prefix == Redirect.WholeHost
        || string.Equals(path, prefix, StringComparison.OrdinalIgnoreCase)
        || path.StartsWith(prefix + "/", StringComparison.OrdinalIgnoreCase);

    public static bool IsReserved(string? path)
    {
        var normalized = Path(path);
        return normalized != Redirect.WholeHost && (IsUnder(normalized, AcmeChallenges) || IsUnder(AcmeChallenges, normalized));
    }

    public static Uri? Absolute(string to) =>
        Uri.TryCreate(to.Trim(), UriKind.Absolute, out var uri) && uri.Scheme is "http" or "https" && uri.Host.Length > 0 && uri.Fragment.Length == 0
            ? uri
            : null;

    public static bool IsRelative(string to)
    {
        var trimmed = to.Trim();
        var namesAnotherSite = trimmed.StartsWith("//", StringComparison.Ordinal) || trimmed.Contains('\\', StringComparison.Ordinal);
        var hasForbidden = trimmed.Contains('#', StringComparison.Ordinal) || trimmed.Any(char.IsWhiteSpace);
        return trimmed.StartsWith('/') && !namesAnotherSite && !hasForbidden;
    }

    public static bool IsTarget(string to) => Absolute(to) is not null || IsRelative(to);

    public static bool IsLoop(string from, string? path, string to)
    {
        var prefix = Path(path);
        if (IsRelative(to))
        {
            return IsUnder(RouteNormalization.Path(to.Trim().Split('?')[0]), prefix);
        }

        return Absolute(to) is { } target
            && string.Equals(target.Host, RouteNormalization.Host(from), StringComparison.OrdinalIgnoreCase)
            && IsUnder(RouteNormalization.Path(target.AbsolutePath), prefix);
    }

    public static bool IsRoute(ApiaryState state, string host)
    {
        var normalized = RouteNormalization.Host(host);
        return state.Routes.Values.Any(r => r.Host == normalized);
    }

    public static bool HidesRoute(ApiaryState state, string host, string? path)
    {
        var normalized = RouteNormalization.Host(host);
        var prefix = Path(path);
        return prefix != Redirect.WholeHost && state.Routes.Values.Any(r => r.Host == normalized && IsUnder(r.Path, prefix));
    }

    public static bool Exists(ApiaryState state, string host, string? path)
    {
        var normalized = RouteNormalization.Host(host);
        var prefix = Path(path);
        return state.Redirects.Values.Any(r => r.From == normalized && string.Equals(r.Path, prefix, StringComparison.OrdinalIgnoreCase));
    }

    public static bool RedirectsWholeHost(ApiaryState state, string host)
    {
        var normalized = RouteNormalization.Host(host);
        return state.Redirects.Values.Any(r => r.From == normalized && r.Path == Redirect.WholeHost);
    }

    public static bool RedirectsRoutePath(ApiaryState state, string host, string routePath)
    {
        var normalized = RouteNormalization.Host(host);
        var path = RouteNormalization.Path(routePath);
        return state.Redirects.Values.Any(r => r.From == normalized && r.Path != Redirect.WholeHost && IsUnder(path, r.Path));
    }
}
