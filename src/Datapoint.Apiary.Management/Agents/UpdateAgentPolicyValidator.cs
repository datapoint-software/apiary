using Datapoint.Apiary.Management.Errors;
using FluentValidation;

namespace Datapoint.Apiary.Management.Agents;

public sealed class UpdateAgentPolicyValidator : AbstractValidator<UpdateAgentPolicy>
{
    public const int MaximumOrigins = 20;

    public UpdateAgentPolicyValidator()
    {
        RuleFor(p => p.TrustedOrigins)
            .NotNull().WithErrorCode(ErrorCodes.Required)
            .Must(o => o is not { Count: > MaximumOrigins }).WithErrorCode(ErrorCodes.AgentOriginsTooMany)
            .Must(o => o?.All(origin => RedirectUris.NormalizeOrigin(origin) is not null) ?? true).WithErrorCode(ErrorCodes.AgentOriginInvalid);
    }
}
