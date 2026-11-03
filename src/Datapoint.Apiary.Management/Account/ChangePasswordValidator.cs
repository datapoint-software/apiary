using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Validation;
using FluentValidation;

namespace Datapoint.Apiary.Management.Account;

public sealed class ChangePasswordValidator : AbstractValidator<ChangePassword>
{
    public ChangePasswordValidator(IBreachedPasswords breached)
    {
        RuleFor(x => x.Current).CurrentPassword();
        RuleFor(x => x.Next).NewPassword(_ => null, breached)
            .NotEqual(x => x.Current).WithErrorCode(ErrorCodes.PasswordUnchanged);
    }
}
