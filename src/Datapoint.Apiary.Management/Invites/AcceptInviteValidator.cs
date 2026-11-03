using Datapoint.Apiary.Management.Validation;
using FluentValidation;

namespace Datapoint.Apiary.Management.Invites;

public sealed class AcceptInviteValidator : AbstractValidator<AcceptInvite>
{
    public AcceptInviteValidator()
    {
        RuleFor(x => x.Password).NewPassword(_ => null);
        RuleFor(x => x.Code).Code();
    }
}
