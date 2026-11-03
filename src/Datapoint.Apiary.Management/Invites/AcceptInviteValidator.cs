using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Validation;
using FluentValidation;

namespace Datapoint.Apiary.Management.Invites;

public sealed class AcceptInviteValidator : AbstractValidator<AcceptInvite>
{
    public AcceptInviteValidator(IBreachedPasswords breached)
    {
        RuleFor(x => x.Password).NewPassword(_ => null, breached);
        RuleFor(x => x.Code).Code();
    }
}
