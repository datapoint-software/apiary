using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Redirects;
using Datapoint.Apiary.Management.Routes;
using Datapoint.Apiary.Management.Streams;
using Datapoint.Apiary.Management.Validation;
using FluentValidation;

namespace Datapoint.Apiary.Management.Stacks;

public sealed class ApplyStackFileValidator : AbstractValidator<ApplyStackFile>
{
    public const int MaximumCommit = 64;
    public const int MaximumPipelineUrl = 2048;
    public const int MaximumProject = Projects.ProjectRules.MaximumNameLength;
    private static readonly int[] s_statusCodes = [301, 302, 307, 308];

    public ApplyStackFileValidator(StreamPortPolicy ports)
    {
        RuleFor(a => a.Stack).Must(StackNames.IsStack).WithErrorCode(ErrorCodes.StackNameInvalid);
        RuleFor(a => a.Routes.Count + a.StreamRoutes.Count + a.Redirects.Count)
            .LessThanOrEqualTo(StackNames.MaximumItems).WithErrorCode(ErrorCodes.StackTooMany).OverridePropertyName(nameof(ApplyStackFile.Routes));
        RuleForEach(a => a.Routes).ChildRules(route =>
        {
            route.RuleFor(r => r.Name).Must(StackNames.IsLabel).WithErrorCode(ErrorCodes.Invalid);
            route.RuleFor(r => r.Service).Must(StackNames.IsLabel).WithErrorCode(ErrorCodes.Invalid);
            route.RuleFor(r => r.Host).Hostname();
            route.RuleFor(r => r.Path).Path();
            route.RuleFor(r => r.Port).Port();
            route.RuleFor(r => r.Project).Must(IsProject).WithErrorCode(ErrorCodes.TooLong);
            route.RuleFor(r => r.TimeoutSeconds).InclusiveBetween(1, RouteRules.MaximumTimeoutSeconds).WithErrorCode(ErrorCodes.Range).When(r => r.TimeoutSeconds is not null);
            route.RuleFor(r => r.RateLimit).InclusiveBetween(1, RouteRules.MaximumRateLimit).WithErrorCode(ErrorCodes.Range).When(r => r.RateLimit is not null);
        });
        RuleForEach(a => a.StreamRoutes).ChildRules(stream =>
        {
            stream.RuleFor(s => s.Name).Must(StackNames.IsLabel).WithErrorCode(ErrorCodes.Invalid);
            stream.RuleFor(s => s.Service).Must(StackNames.IsLabel).WithErrorCode(ErrorCodes.Invalid);
            stream.RuleFor(s => s.Protocol).IsInEnum().WithErrorCode(ErrorCodes.Invalid);
            stream.RuleFor(s => s.ListenPort).Cascade(CascadeMode.Stop)
                .Port()
                .Must(port => !ports.Reserved.Contains(port)).WithErrorCode(ErrorCodes.StreamPortReserved);
            stream.RuleFor(s => s.Port).Port();
            stream.RuleFor(s => s.Project).Must(IsProject).WithErrorCode(ErrorCodes.TooLong);
        });
        RuleForEach(a => a.Redirects).ChildRules(redirect =>
        {
            redirect.RuleFor(r => r.Name).Must(StackNames.IsLabel).WithErrorCode(ErrorCodes.Invalid);
            redirect.RuleFor(r => r.Service).Must(StackNames.IsLabel).WithErrorCode(ErrorCodes.Invalid);
            redirect.RuleFor(r => r.From).Hostname();
            redirect.RuleFor(r => r.To).Cascade(CascadeMode.Stop)
                .MaximumLength(CreateRedirectValidator.MaximumTargetLength).WithErrorCode(ErrorCodes.TooLong)
                .Must(to => CreateRedirectValidator.Target(to) is not null).WithErrorCode(ErrorCodes.RedirectTargetInvalid)
                .Must((r, to) => !string.Equals(CreateRedirectValidator.Target(to)!.Host, RouteNormalization.Host(r.From), StringComparison.OrdinalIgnoreCase))
                .WithErrorCode(ErrorCodes.RedirectLoop);
            redirect.RuleFor(r => r.StatusCode).Must(code => s_statusCodes.Contains(code!.Value)).WithErrorCode(ErrorCodes.RedirectStatusCode).When(r => r.StatusCode is not null);
            redirect.RuleFor(r => r.Project).Must(IsProject).WithErrorCode(ErrorCodes.TooLong);
        });
        RuleFor(a => a).Must(HasUniqueNames).WithErrorCode(ErrorCodes.StackDuplicate).OverridePropertyName(nameof(ApplyStackFile.Routes));
        RuleFor(a => a).Must(HasUniqueAddresses).WithErrorCode(ErrorCodes.StackDuplicate).OverridePropertyName(nameof(ApplyStackFile.Routes));
        RuleFor(a => a.Commit).Must(IsCommit).WithErrorCode(ErrorCodes.StackCommitInvalid).When(a => a.Commit is not null);
        RuleFor(a => a.PipelineUrl).Must(IsPipelineUrl).WithErrorCode(ErrorCodes.StackPipelineUrlInvalid).When(a => a.PipelineUrl is not null);
    }

    public static bool IsPipelineUrl(string? url) =>
        url is { Length: <= MaximumPipelineUrl }
        && Uri.TryCreate(url, UriKind.Absolute, out var uri)
        && uri.Scheme == Uri.UriSchemeHttps
        && uri.Host.Length > 0;

    private static bool IsCommit(string? commit) =>
        commit is { Length: > 0 and <= MaximumCommit } && commit.All(c => char.IsAsciiLetterOrDigit(c) || c is '.' or '-' or '_');

    private static bool IsProject(string? project) => project is null || project.Trim().Length <= MaximumProject;

    private static bool HasUniqueNames(ApplyStackFile apply) =>
        IsUnique(apply.Routes.Select(r => (r.Service, r.Name)))
        && IsUnique(apply.StreamRoutes.Select(s => (s.Service, s.Name)))
        && IsUnique(apply.Redirects.Select(r => (r.Service, r.Name)));

    private static bool HasUniqueAddresses(ApplyStackFile apply) =>
        IsUnique(apply.Routes.Select(r => (RouteNormalization.Host(r.Host), RouteNormalization.Path(r.Path).ToLowerInvariant())))
        && IsUnique(apply.Redirects.Select(r => RouteNormalization.Host(r.From)))
        && IsUnique(apply.StreamRoutes.Select(s => (s.Protocol, s.ListenPort)))
        && !apply.Redirects.Any(r => apply.Routes.Any(route => RouteNormalization.Host(route.Host) == RouteNormalization.Host(r.From)));

    private static bool IsUnique<T>(IEnumerable<T> keys)
    {
        var list = keys.ToList();
        return list.Distinct().Count() == list.Count;
    }
}
