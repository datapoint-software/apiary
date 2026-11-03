using System.Text.Json;

namespace Datapoint.Apiary.Replication;

public sealed record ForwardedResult(JsonElement? Result, ForwardedCookie? Cookie, long Index);
