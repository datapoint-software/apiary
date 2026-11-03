using System.Security.Cryptography;
using Datapoint.Apiary.Security.Tokens;

namespace Datapoint.Apiary.Management.Agents;

public sealed class AgentGrants(SealedTokens tokens)
{
    private const string CodePurpose = "apiary.agent-code";
    private const string AccessPurpose = "apiary.agent-access";
    private const string RefreshPurpose = "apiary.agent-refresh";
    private const int IdSize = 16;
    private const int NonceSize = 32;

    public string NewCode(Guid agentId) => Seal(CodePurpose, agentId);

    public string NewAccess(Guid agentId) => Seal(AccessPurpose, agentId);

    public string NewRefresh(Guid agentId) => Seal(RefreshPurpose, agentId);

    public Guid? CodeAgent(string code) => AgentOf(CodePurpose, code);

    public Guid? AccessAgent(string token) => AgentOf(AccessPurpose, token);

    public Guid? RefreshAgent(string token) => AgentOf(RefreshPurpose, token);

    private string Seal(string purpose, Guid agentId) =>
        tokens.Seal(purpose, [.. agentId.ToByteArray(), .. RandomNumberGenerator.GetBytes(NonceSize)]);

    private Guid? AgentOf(string purpose, string token) =>
        tokens.Open(purpose, token) is { Length: IdSize + NonceSize } payload ? new Guid(payload.AsSpan(0, IdSize)) : null;
}
