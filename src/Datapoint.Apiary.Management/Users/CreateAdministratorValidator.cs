using Datapoint.Apiary.Management.Validation;
using FluentValidation;

namespace Datapoint.Apiary.Management.Users;

public sealed class CreateAdministratorValidator : AbstractValidator<CreateAdministrator>
{
    public CreateAdministratorValidator()
    {
        RuleFor(x => x.Name).PersonName();
        RuleFor(x => x.Email).Email();
    }
}
