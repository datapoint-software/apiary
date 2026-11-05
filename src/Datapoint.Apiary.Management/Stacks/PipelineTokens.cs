using Datapoint.Apiary.Cluster.Stacks;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Security.Tokens;

namespace Datapoint.Apiary.Management.Stacks;

public static class PipelineTokens
{
    public const string Prefix = "apiary_pt_";
    public const int MaximumName = 63;
    public static readonly IReadOnlyList<int> Days = [30, 90, 365];

    public static (PipelineToken Token, string Value) Create(string name, string stack, int days, DateTimeOffset now, string? by)
    {
        var value = Prefix + SecretTokens.New();
        var token = new PipelineToken(Guid.CreateVersion7(now), name.Trim(), stack, SecretTokens.Hash(value), now, by, now.AddDays(days));
        return (token, value);
    }

    public static bool IsNameTaken(ApiaryState state, string name) =>
        state.PipelineTokens.Values.Any(t => string.Equals(t.Name, name.Trim(), StringComparison.OrdinalIgnoreCase));

    public static PipelineToken? Find(ApiaryState state, string value, DateTimeOffset now)
    {
        if (!value.StartsWith(Prefix, StringComparison.Ordinal))
        {
            return null;
        }

        var hash = SecretTokens.Hash(value);
        return state.PipelineTokens.Values.FirstOrDefault(t => t.Hash == hash && t.ExpiresAt > now && state.Stacks.ContainsKey(t.Stack));
    }
}
