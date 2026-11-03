using Datapoint.Apiary.Management.Errors;
using FluentValidation;

namespace Datapoint.Apiary.Management.Routes;

public sealed class PurgeRouteCachesValidator : AbstractValidator<PurgeRouteCaches>
{
    public PurgeRouteCachesValidator()
    {
        RuleFor(p => p.Ids).Cascade(CascadeMode.Stop)
            .NotEmpty().WithErrorCode(ErrorCodes.Required)
            .Must(ids => ids.Count <= MoveRoutesValidator.MaximumRoutes).WithErrorCode(ErrorCodes.TooLong);
    }
}
