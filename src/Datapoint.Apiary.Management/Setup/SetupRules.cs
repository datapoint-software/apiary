using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Validation;
using FluentValidation;

namespace Datapoint.Apiary.Management.Setup;

public static class SetupRules
{
    public static void AddSetupRules<T>(this AbstractValidator<T> validator, IBreachedPasswords breached)
        where T : ISetupFields
    {
        validator.RuleFor(x => x.Name).PersonName();
        validator.RuleFor(x => x.Email).Email();
        validator.RuleFor(x => x.Password).NewPassword(x => x.Email, breached);
    }
}
