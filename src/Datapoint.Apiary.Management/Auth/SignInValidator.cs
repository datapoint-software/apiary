using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Validation;
using Datapoint.Apiary.Security.Passwords;
using FluentValidation;

namespace Datapoint.Apiary.Management.Auth;

public sealed class SignInValidator : AbstractValidator<SignIn>
{
    public SignInValidator()
    {
        RuleFor(x => x.Email).Email();
        RuleFor(x => x.Password).Cascade(CascadeMode.Stop)
            .NotEmpty().WithErrorCode(ErrorCodes.Required)
            .MaximumLength(PasswordPolicy.MaximumLength).WithErrorCode(ErrorCodes.TooLong);
    }
}
