using FluentValidation;

namespace Datapoint.Apiary.Management.Agents;

public sealed class RevokeAgentTokenValidator : AbstractValidator<RevokeAgentToken>
{
    public RevokeAgentTokenValidator(AgentGrants grants)
    {
        RuleFor(c => c.Token).Must(t => grants.AccessAgent(t) is not null || grants.RefreshAgent(t) is not null)
            .WithErrorCode(AgentTokenResult.InvalidRequest);
        RuleFor(c => c.ClientId).NotEmpty().WithErrorCode(AgentTokenResult.InvalidRequest);
    }
}
