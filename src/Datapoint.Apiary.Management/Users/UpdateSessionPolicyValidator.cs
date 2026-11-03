using Datapoint.Apiary.Management.Errors;
using FluentValidation;

namespace Datapoint.Apiary.Management.Users;

public sealed class UpdateSessionPolicyValidator : AbstractValidator<UpdateSessionPolicy>
{
    public const int MinimumMinutes = 5;
    public const int MaximumMinutes = 720;

    public UpdateSessionPolicyValidator() =>
        RuleFor(p => p.IdleMinutes).InclusiveBetween(MinimumMinutes, MaximumMinutes).WithErrorCode(ErrorCodes.Range);
}
