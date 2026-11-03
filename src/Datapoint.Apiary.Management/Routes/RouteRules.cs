using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Validation;
using FluentValidation;

namespace Datapoint.Apiary.Management.Routes;

public static class RouteRules
{
    public const int MaximumTimeoutSeconds = 120;
    public const int MaximumAllowedAddresses = 100;
    public const int MaximumRateLimit = 100_000;
    public const int MaximumMaintenanceMessage = 200;
    public const int MaximumTargets = 10;
    public const int MaximumCanaryValue = 200;
    public static readonly TimeSpan MaximumMaintenance = TimeSpan.FromDays(7);

    public static void AddRouteRules<T>(this AbstractValidator<T> validator, IClusterState cluster, TimeProvider time, Func<T, Guid?> existingId)
        where T : IRouteFields
    {
        validator.RuleFor(r => r.ProjectId)
            .Must(id => cluster.Current.Projects.ContainsKey(id)).WithErrorCode(ErrorCodes.ProjectNotFound);
        validator.RuleFor(r => r.Host).Cascade(CascadeMode.Stop)
            .Hostname()
            .Must(host => !Redirects.CreateRedirectValidator.IsRedirect(cluster.Current, host)).WithErrorCode(ErrorCodes.RouteRedirectExists);
        validator.RuleFor(r => r.Path).Path();
        validator.RuleFor(r => r.TimeoutSeconds).InclusiveBetween(1, MaximumTimeoutSeconds).WithErrorCode(ErrorCodes.Range);
        validator.RuleFor(r => r.Targets).Cascade(CascadeMode.Stop)
            .NotEmpty().WithErrorCode(ErrorCodes.RouteTargetsRequired)
            .Must(t => t.Count <= MaximumTargets).WithErrorCode(ErrorCodes.RouteTargetsTooMany)
            .Must(t => t.Count == 1 || t.Sum(target => target.Weight) == 100).WithErrorCode(ErrorCodes.RouteWeightsTotal);
        validator.RuleForEach(r => r.Targets).ChildRules(target =>
        {
            target.RuleFor(t => t.Host).Target();
            target.RuleFor(t => t.Port).Port();
            target.RuleFor(t => t.Weight).InclusiveBetween(0, 100).WithErrorCode(ErrorCodes.Range);
        });
        validator.RuleFor(r => r.Canary!).ChildRules(canary =>
        {
            canary.RuleFor(c => c.Source).IsInEnum().WithErrorCode(ErrorCodes.Invalid);
            canary.RuleFor(c => c.Name).Must(IsToken).WithErrorCode(ErrorCodes.RouteCanaryName);
            canary.RuleFor(c => c.Value).Cascade(CascadeMode.Stop)
                .Must(v => !string.IsNullOrWhiteSpace(v)).WithErrorCode(ErrorCodes.Required)
                .MaximumLength(MaximumCanaryValue).WithErrorCode(ErrorCodes.TooLong)
                .Must(v => v.All(c => c is >= ' ' and <= '~' && c is not ';' and not ',')).WithErrorCode(ErrorCodes.Invalid);
        }).When(r => r.Canary is not null && r.Targets.Count > 1);
        validator.RuleFor(r => r.AllowedAddresses).Cascade(CascadeMode.Stop)
            .Must(a => RouteNormalization.Addresses(a) is not { Count: > MaximumAllowedAddresses }).WithErrorCode(ErrorCodes.IpRangeTooMany)
            .Must(a => RouteNormalization.Addresses(a)?.All(RuleExtensions.IsIpRange) ?? true).WithErrorCode(ErrorCodes.IpRangeInvalid);
        validator.RuleFor(r => r.RateLimit).InclusiveBetween(1, MaximumRateLimit).WithErrorCode(ErrorCodes.Range).When(r => r.RateLimit is not null);
        validator.RuleFor(r => r.Maintenance!).ChildRules(window =>
        {
            window.RuleFor(w => w.End)
                .Must((w, end) => end > w.Start).WithErrorCode(ErrorCodes.MaintenanceEndBeforeStart)
                .Must((w, end) => end - w.Start <= MaximumMaintenance).WithErrorCode(ErrorCodes.MaintenanceTooLong)
                .Must(end => end > time.GetUtcNow()).WithErrorCode(ErrorCodes.MaintenanceEnded);
            window.RuleFor(w => w.Message).MaximumLength(MaximumMaintenanceMessage).WithErrorCode(ErrorCodes.TooLong);
        }).When(r => r.Maintenance is not null);
        validator.RuleFor(r => r.CertificateId).Cascade(CascadeMode.Stop)
            .Must(id => cluster.Current.Certificates.ContainsKey(id!.Value)).WithErrorCode(ErrorCodes.CertificateNotFound)
            .Must(id => cluster.Current.Certificates[id!.Value].Source == CertificateSource.Uploaded).WithErrorCode(ErrorCodes.CertificateNotUploaded)
            .When(r => r.CertificateId is not null);
        validator.RuleFor(r => r)
            .Must(r => Covers(cluster.Current, r))
            .WithErrorCode(ErrorCodes.CertificateDoesNotCover)
            .OverridePropertyName(nameof(IRouteFields.CertificateId))
            .When(r => r.CertificateId is { } id && cluster.Current.Certificates.TryGetValue(id, out var c) && c.Source == CertificateSource.Uploaded);
        validator.RuleFor(r => r)
            .Must(r => !IsDuplicate(cluster.Current, r.Host, r.Path, existingId(r)))
            .WithErrorCode(ErrorCodes.RouteDuplicate)
            .OverridePropertyName(nameof(IRouteFields.Path));
    }

    private static bool IsToken(string name) =>
        name.Trim() is { Length: > 0 and <= 100 } trimmed && trimmed.All(c => char.IsAsciiLetterOrDigit(c) || "!#$%&'*+-.^_`|~".Contains(c));

    private static bool Covers(ApiaryState state, IRouteFields fields) =>
        state.Certificates[fields.CertificateId!.Value].Material?.Covers(RouteNormalization.Host(fields.Host)) == true;

    public static bool IsDuplicate(ApiaryState state, string host, string path, Guid? existingId)
    {
        host = RouteNormalization.Host(host);
        path = RouteNormalization.Path(path);
        return state.Routes.Values.Any(r => r.Id != existingId && r.Host == host && string.Equals(r.Path, path, StringComparison.OrdinalIgnoreCase));
    }
}
