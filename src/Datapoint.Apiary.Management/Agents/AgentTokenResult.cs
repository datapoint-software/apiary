namespace Datapoint.Apiary.Management.Agents;

public sealed record AgentTokenResult(string? AccessToken, string? RefreshToken, int ExpiresIn, string? Error)
{
    public const string InvalidRequest = "invalid_request";
    public const string InvalidGrant = "invalid_grant";
    public const string InvalidClient = "invalid_client";
    public const string UnsupportedGrantType = "unsupported_grant_type";

    public static AgentTokenResult Failed(string error) => new(null, null, 0, error);
}
