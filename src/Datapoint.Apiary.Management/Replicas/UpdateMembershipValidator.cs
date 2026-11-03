using Datapoint.Apiary.Management.Errors;
using FluentValidation;

namespace Datapoint.Apiary.Management.Replicas;

public sealed class UpdateMembershipValidator : AbstractValidator<UpdateMembership>
{
    public const int MinimumMinutes = 5;
    public const int MaximumMinutes = 1440;

    public UpdateMembershipValidator()
    {
        RuleFor(m => m.Mode).IsInEnum().WithErrorCode(ErrorCodes.Invalid);
        RuleFor(m => m.RemoveMissingAfterMinutes).InclusiveBetween(MinimumMinutes, MaximumMinutes).WithErrorCode(ErrorCodes.Range);
    }
}
