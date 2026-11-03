namespace Datapoint.Apiary.Api;

public sealed record ApiProblem(
    int Status,
    string Code,
    IReadOnlyList<FieldError>? Errors = null,
    string? TraceId = null,
    IReadOnlyDictionary<string, object?>? Params = null)
{
    public IResult ToResult() => Results.Json(this, ApiJson.Options, "application/problem+json", Status);
}
