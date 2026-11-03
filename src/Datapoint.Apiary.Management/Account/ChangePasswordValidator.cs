using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Validation;
using Datapoint.Apiary.Security.Passwords;
using FluentValidation;

namespace Datapoint.Apiary.Management.Account;

public sealed class ChangePasswordValidator : AbstractValidator<ChangePassword>
{
    public ChangePasswordValidator()
    {
        RuleFor(x => x.Current).Cascade(CascadeMode.Stop)
            .NotEmpty().WithErrorCode(ErrorCodes.Required)
            .MaximumLength(PasswordPolicy.MaximumLength).WithErrorCode(ErrorCodes.PasswordIncorrect);
        RuleFor(x => x.Next).NewPassword(_ => null)
            .NotEqual(x => x.Current).WithErrorCode(ErrorCodes.PasswordUnchanged);
    }
}
