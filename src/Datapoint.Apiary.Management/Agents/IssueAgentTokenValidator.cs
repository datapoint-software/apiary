using FluentValidation;

namespace Datapoint.Apiary.Management.Agents;

public sealed class IssueAgentTokenValidator : AbstractValidator<IssueAgentToken>
{
    public IssueAgentTokenValidator(AgentGrants grants)
    {
        RuleFor(c => c.GrantType).Must(g => g is "authorization_code" or "refresh_token").WithErrorCode(AgentTokenResult.UnsupportedGrantType);
        When(c => c.GrantType == "authorization_code", () =>
        {
            RuleFor(c => c.Code).Cascade(CascadeMode.Stop)
                .NotEmpty().WithErrorCode(AgentTokenResult.InvalidRequest)
                .Must(c => grants.CodeAgent(c!) is not null).WithErrorCode(AgentTokenResult.InvalidGrant);
            RuleFor(c => c.CodeVerifier).NotEmpty().WithErrorCode(AgentTokenResult.InvalidRequest);
        });
        When(c => c.GrantType == "refresh_token", () =>
            RuleFor(c => c.RefreshToken).Cascade(CascadeMode.Stop)
                .NotEmpty().WithErrorCode(AgentTokenResult.InvalidRequest)
                .Must(t => grants.RefreshAgent(t!) is not null).WithErrorCode(AgentTokenResult.InvalidGrant));
    }
}
