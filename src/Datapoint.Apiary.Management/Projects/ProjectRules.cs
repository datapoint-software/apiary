using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;
using FluentValidation;

namespace Datapoint.Apiary.Management.Projects;

public static class ProjectRules
{
    public const int MaximumNameLength = 40;
    public const int MaximumDescriptionLength = 120;

    public static void AddProjectRules<T>(this AbstractValidator<T> validator, IClusterState cluster, Func<T, Guid?> id)
        where T : IProjectFields
    {
        validator.RuleFor(p => p.Name).Cascade(CascadeMode.Stop)
            .Must(name => !string.IsNullOrWhiteSpace(name)).WithErrorCode(ErrorCodes.Required)
            .MaximumLength(MaximumNameLength).WithErrorCode(ErrorCodes.TooLong)
            .Must((p, name) => !IsTaken(cluster.Current, name, id(p))).WithErrorCode(ErrorCodes.ProjectNameTaken);
        validator.RuleFor(p => p.Description)
            .MaximumLength(MaximumDescriptionLength).WithErrorCode(ErrorCodes.TooLong);
        validator.RuleFor(p => p.Icon)
            .Must(ProjectIcons.All.Contains).WithErrorCode(ErrorCodes.ProjectIconUnknown);
    }

    private static bool IsTaken(ApiaryState state, string name, Guid? id)
    {
        var trimmed = name.Trim();
        return state.Projects.Values.Any(p => p.Id != id && string.Equals(p.Name, trimmed, StringComparison.OrdinalIgnoreCase));
    }
}
