using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;
using FluentValidation;

namespace Datapoint.Apiary.Management.Routes;

public sealed class MoveRoutesValidator : AbstractValidator<MoveRoutes>
{
    public const int MaximumRoutes = 500;

    public MoveRoutesValidator(IClusterState cluster)
    {
        RuleFor(m => m.Ids).Cascade(CascadeMode.Stop)
            .NotEmpty().WithErrorCode(ErrorCodes.Required)
            .Must(ids => ids.Count <= MaximumRoutes).WithErrorCode(ErrorCodes.TooLong);
        RuleFor(m => m.ProjectId)
            .Must(id => cluster.Current.Projects.ContainsKey(id)).WithErrorCode(ErrorCodes.ProjectNotFound);
    }
}
