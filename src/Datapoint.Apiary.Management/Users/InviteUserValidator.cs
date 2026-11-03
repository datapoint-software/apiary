using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Validation;
using FluentValidation;

namespace Datapoint.Apiary.Management.Users;

public sealed class InviteUserValidator : AbstractValidator<InviteUser>
{
    public InviteUserValidator()
    {
        RuleFor(x => x.Name).PersonName();
        RuleFor(x => x.Email).Email();
        RuleFor(x => x.Role).IsInEnum().WithErrorCode(ErrorCodes.Invalid);
    }
}
