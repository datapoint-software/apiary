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
    public const int MaximumMaintenanceMessage = 200;
    public static readonly TimeSpan MaximumMaintenance = TimeSpan.FromDays(7);

    public static void AddRouteRules<T>(this AbstractValidator<T> validator, IClusterState cluster, TimeProvider time, Func<T, Guid?> existingId)
        where T : IRouteFields
    {
        validator.RuleFor(r => r.ProjectId)
            .Must(id => cluster.Current.Projects.ContainsKey(id)).WithErrorCode(ErrorCodes.ProjectNotFound);
        validator.RuleFor(r => r.Host).Hostname();
        validator.RuleFor(r => r.Path).Path();
        validator.RuleFor(r => r.TimeoutSeconds).InclusiveBetween(1, MaximumTimeoutSeconds).WithErrorCode(ErrorCodes.Range);
        validator.RuleFor(r => r.Targets).NotEmpty().WithErrorCode(ErrorCodes.RouteTargetsRequired);
        validator.RuleForEach(r => r.Targets).ChildRules(target =>
        {
            target.RuleFor(t => t.Host).Target();
            target.RuleFor(t => t.Port).Port();
        });
        validator.RuleFor(r => r.AllowedAddresses).Cascade(CascadeMode.Stop)
            .Must(a => RouteNormalization.Addresses(a) is not { Count: > MaximumAllowedAddresses }).WithErrorCode(ErrorCodes.IpRangeTooMany)
            .Must(a => RouteNormalization.Addresses(a)?.All(RuleExtensions.IsIpRange) ?? true).WithErrorCode(ErrorCodes.IpRangeInvalid);
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
            .Must(r => !IsDuplicate(cluster.Current, r, existingId(r)))
            .WithErrorCode(ErrorCodes.RouteDuplicate)
            .OverridePropertyName(nameof(IRouteFields.Path));
    }

    private static bool Covers(ApiaryState state, IRouteFields fields) =>
        state.Certificates[fields.CertificateId!.Value].Material?.Covers(RouteNormalization.Host(fields.Host)) == true;

    private static bool IsDuplicate(ApiaryState state, IRouteFields fields, Guid? existingId)
    {
        var host = RouteNormalization.Host(fields.Host);
        var path = RouteNormalization.Path(fields.Path);
        return state.Routes.Values.Any(r => r.Id != existingId && r.Host == host && string.Equals(r.Path, path, StringComparison.OrdinalIgnoreCase));
    }
}
