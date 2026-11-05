using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Validation;
using FluentValidation;

namespace Datapoint.Apiary.Management.Redirects;

public sealed class CreateRedirectValidator : AbstractValidator<CreateRedirect>
{
    public CreateRedirectValidator(IClusterState cluster)
    {
        RuleFor(r => r.ProjectId)
            .Must(id => cluster.Current.Projects.ContainsKey(id)).WithErrorCode(ErrorCodes.ProjectNotFound);
        RuleFor(r => r.From)
            .Must(from => !IsWildcard(from)).WithErrorCode(ErrorCodes.RedirectWildcard);
        RuleFor(r => r.From).Cascade(CascadeMode.Stop)
            .Hostname()
            .Must((r, from) => !RedirectRules.IsWholeHost(r.Path) || !RedirectRules.IsRoute(cluster.Current, from)).WithErrorCode(ErrorCodes.RedirectRouteExists)
            .Must((r, from) => !RedirectRules.IsWholeHost(r.Path) || !RedirectRules.Exists(cluster.Current, from, r.Path)).WithErrorCode(ErrorCodes.RedirectDuplicate)
            .When(r => !IsWildcard(r.From));
        RuleFor(r => r.Path!).Cascade(CascadeMode.Stop)
            .RedirectPath()
            .Must((r, path) => !RedirectRules.HidesRoute(cluster.Current, r.From, path)).WithErrorCode(ErrorCodes.RedirectHidesRoute)
            .Must((r, path) => !RedirectRules.Exists(cluster.Current, r.From, path)).WithErrorCode(ErrorCodes.RedirectDuplicate)
            .When(r => !RedirectRules.IsWholeHost(r.Path));
        RuleFor(r => r.To).RedirectTarget(r => r.From, r => r.Path);
        RuleFor(r => r.StatusCode)
            .Must(RedirectRules.IsStatusCode).WithErrorCode(ErrorCodes.RedirectStatusCode);
    }

    private static bool IsWildcard(string from) => from.TrimStart().StartsWith("*.", StringComparison.Ordinal);
}
