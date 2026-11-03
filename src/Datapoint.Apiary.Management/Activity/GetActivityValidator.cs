using Datapoint.Apiary.Management.Errors;
using FluentValidation;

namespace Datapoint.Apiary.Management.Activity;

public sealed class GetActivityValidator : AbstractValidator<GetActivity>
{
    public GetActivityValidator()
    {
        RuleFor(q => q.Range).IsInEnum().WithErrorCode(ErrorCodes.Invalid);
    }
}
