using Datapoint.Apiary.Management.Errors;
using FluentValidation;

namespace Datapoint.Apiary.Management.Users;

public sealed class ChangeRoleValidator : AbstractValidator<ChangeRole>
{
    public ChangeRoleValidator() => RuleFor(x => x.Role).IsInEnum().WithErrorCode(ErrorCodes.Invalid);
}
