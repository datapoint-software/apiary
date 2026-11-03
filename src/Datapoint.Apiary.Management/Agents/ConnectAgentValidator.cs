using Datapoint.Apiary.Management.Errors;
using FluentValidation;

namespace Datapoint.Apiary.Management.Agents;

public sealed class ConnectAgentValidator : AbstractValidator<ConnectAgent>
{
    public ConnectAgentValidator()
    {
        RuleFor(c => c.ClientId).NotEmpty().WithErrorCode(ErrorCodes.AgentClientUnknown);
        RuleFor(c => c.RedirectUri).NotEmpty().WithErrorCode(ErrorCodes.AgentRedirectUnknown);
        RuleFor(c => c.CodeChallenge).Matches("^[A-Za-z0-9_-]{43,128}$").WithErrorCode(ErrorCodes.AgentChallengeInvalid);
        RuleFor(c => c.CodeChallengeMethod).Equal("S256").WithErrorCode(ErrorCodes.AgentChallengeInvalid);
        RuleFor(c => c.State).MaximumLength(1000).WithErrorCode(ErrorCodes.TooLong);
    }
}
