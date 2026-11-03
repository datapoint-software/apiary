namespace Datapoint.Apiary.Management.Errors;

public sealed class ActionFailedException : Exception
{
    public ActionFailedException()
        : this(ErrorCodes.Internal, FailureKind.Conflict)
    {
    }

    public ActionFailedException(string message)
        : this(message, FailureKind.Conflict)
    {
    }

    public ActionFailedException(string message, Exception innerException)
        : base(message, innerException)
    {
        Code = message;
    }

    public ActionFailedException(string code, FailureKind kind)
        : base(code)
    {
        Code = code;
        Kind = kind;
    }

    public string Code { get; }

    public FailureKind Kind { get; }

    public IReadOnlyDictionary<string, object?>? Params { get; init; }

    public static ActionFailedException NotFound(string code) => new(code, FailureKind.NotFound);

    public static ActionFailedException Conflict(string code) => new(code, FailureKind.Conflict);

    public static ActionFailedException Forbidden(string code) => new(code, FailureKind.Forbidden);

    public static ActionFailedException Invalid(string code) => new(code, FailureKind.Invalid);
}
