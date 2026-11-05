namespace Datapoint.Apiary.Management.Stacks;

public sealed record NewPipelineToken(Guid Id, string Name, string Stack, string Token, DateTimeOffset ExpiresAt);
