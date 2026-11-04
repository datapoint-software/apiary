using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Routes;
using Datapoint.Apiary.Management.Validation;
using FluentValidation;

namespace Datapoint.Apiary.Management.Redirects;

public sealed class CreateRedirectValidator : AbstractValidator<CreateRedirect>
{
    public const int MaximumTargetLength = 2048;
    private static readonly int[] s_statusCodes = [301, 302, 307, 308];

    public CreateRedirectValidator(IClusterState cluster)
    {
        RuleFor(r => r.ProjectId)
            .Must(id => cluster.Current.Projects.ContainsKey(id)).WithErrorCode(ErrorCodes.ProjectNotFound);
        RuleFor(r => r.From)
            .Must(from => !IsWildcard(from)).WithErrorCode(ErrorCodes.RedirectWildcard);
        RuleFor(r => r.From).Cascade(CascadeMode.Stop)
            .Hostname()
            .Must(from => !IsRoute(cluster.Current, from)).WithErrorCode(ErrorCodes.RedirectRouteExists)
            .Must(from => !IsRedirect(cluster.Current, from)).WithErrorCode(ErrorCodes.RedirectDuplicate)
            .When(r => !IsWildcard(r.From));
        RuleFor(r => r.To).Cascade(CascadeMode.Stop)
            .NotEmpty().WithErrorCode(ErrorCodes.Required)
            .MaximumLength(MaximumTargetLength).WithErrorCode(ErrorCodes.TooLong)
            .Must(to => Target(to) is not null).WithErrorCode(ErrorCodes.RedirectTargetInvalid)
            .Must((r, to) => !string.Equals(Target(to)!.Host, RouteNormalization.Host(r.From), StringComparison.OrdinalIgnoreCase))
            .WithErrorCode(ErrorCodes.RedirectLoop);
        RuleFor(r => r.StatusCode)
            .Must(code => s_statusCodes.Contains(code)).WithErrorCode(ErrorCodes.RedirectStatusCode);
    }

    public static bool IsRoute(ApiaryState state, string host)
    {
        var normalized = RouteNormalization.Host(host);
        return state.Routes.Values.Any(r => r.Host == normalized);
    }

    public static bool IsRedirect(ApiaryState state, string host)
    {
        var normalized = RouteNormalization.Host(host);
        return state.Redirects.Values.Any(r => r.From == normalized);
    }

    private static bool IsWildcard(string from) => from.TrimStart().StartsWith("*.", StringComparison.Ordinal);

    private static Uri? Target(string to) =>
        Uri.TryCreate(to.Trim(), UriKind.Absolute, out var uri) && uri.Scheme is "http" or "https" && uri.Host.Length > 0 && uri.Fragment.Length == 0
            ? uri
            : null;
}
