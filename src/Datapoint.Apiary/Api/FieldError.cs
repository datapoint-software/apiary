namespace Datapoint.Apiary.Api;

public sealed record FieldError(string Field, string Code, IReadOnlyDictionary<string, object?>? Params);
