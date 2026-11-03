using System.Text.Json;

namespace Datapoint.Apiary.Replication;

public sealed record ForwardedCommand(
    Guid RequestId,
    string Action,
    JsonElement Arguments,
    string? AuthenticationType,
    IReadOnlyList<ForwardedClaim> Claims,
    string? Address,
    string? Client,
    string? Device);
