using Datapoint.Apiary.Management.Validation;
using FluentValidation;

namespace Datapoint.Apiary.Management.Account;

public sealed class ConfirmTwoStepValidator : AbstractValidator<ConfirmTwoStep>
{
    public ConfirmTwoStepValidator() => RuleFor(x => x.Code).Code();
}
