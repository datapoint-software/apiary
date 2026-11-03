using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Validation;
using FluentValidation;

namespace Datapoint.Apiary.Management.Routes;

public static class RouteRules
{
    public const int MaximumTimeoutSeconds = 3600;

    public static void AddRouteRules<T>(this AbstractValidator<T> validator, IClusterState cluster, Func<T, Guid?> existingId)
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
        validator.RuleFor(r => r)
            .Must(r => !IsDuplicate(cluster.Current, r, existingId(r)))
            .WithErrorCode(ErrorCodes.RouteDuplicate)
            .OverridePropertyName(nameof(IRouteFields.Path));
    }

    private static bool IsDuplicate(ApiaryState state, IRouteFields fields, Guid? existingId)
    {
        var host = RouteNormalization.Host(fields.Host);
        var path = RouteNormalization.Path(fields.Path);
        return state.Routes.Values.Any(r => r.Id != existingId && r.Host == host && string.Equals(r.Path, path, StringComparison.OrdinalIgnoreCase));
    }
}
