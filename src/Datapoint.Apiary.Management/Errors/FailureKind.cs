namespace Datapoint.Apiary.Management.Errors;

public enum FailureKind
{
    NotFound,
    Conflict,
    Unavailable,
    Forbidden,
    Throttled,
    Invalid,
}
