using System.Security.Claims;

namespace Datapoint.Apiary.Management.Accounts;

public static class ApiaryClaims
{
    public const string UserId = ClaimTypes.NameIdentifier;
    public const string Email = ClaimTypes.Name;
    public const string Role = ClaimTypes.Role;
    public const string SessionId = "apiary:session";
    public const string Local = "apiary:local";
    public const string AgentId = "apiary:agent";
    public const string Client = "apiary:client";
    public const string Pipeline = "apiary:pipeline";
    public const string PipelineTokenId = "apiary:pipeline-token";
    public const string Stack = "apiary:stack";
}
