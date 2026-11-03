using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Validation;
using FluentValidation;

namespace Datapoint.Apiary.Management.Setup;

public sealed class CompleteSetupValidator : AbstractValidator<CompleteSetup>
{
    public CompleteSetupValidator(IBreachedPasswords breached)
    {
        this.AddSetupRules(breached);
        RuleFor(x => x.Code).Code();
    }
}
