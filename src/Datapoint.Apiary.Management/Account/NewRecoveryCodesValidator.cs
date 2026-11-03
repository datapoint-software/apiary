using Datapoint.Apiary.Management.Validation;
using FluentValidation;

namespace Datapoint.Apiary.Management.Account;

public sealed class NewRecoveryCodesValidator : AbstractValidator<NewRecoveryCodes>
{
    public NewRecoveryCodesValidator() => RuleFor(x => x.Password).CurrentPassword();
}
