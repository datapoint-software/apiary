using Datapoint.Apiary.Management.Validation;
using FluentValidation;

namespace Datapoint.Apiary.Management.Auth;

public sealed class VerifySignInValidator : AbstractValidator<VerifySignIn>
{
    public VerifySignInValidator() => RuleFor(x => x.Code).Code();
}
