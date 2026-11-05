using Datapoint.Apiary.Cluster.Stacks;

namespace Datapoint.Apiary.Management.Stacks;

public sealed record PipelineTokenView(Guid Id, string Name, string Stack, DateTimeOffset CreatedAt, string? CreatedBy, DateTimeOffset ExpiresAt, DateTimeOffset? LastUsedAt)
{
    public static PipelineTokenView Of(PipelineToken token) =>
        new(token.Id, token.Name, token.Stack, token.CreatedAt, token.CreatedBy, token.ExpiresAt, token.LastUsedAt);
}
