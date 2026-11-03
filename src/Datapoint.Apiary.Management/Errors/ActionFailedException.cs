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

    public static ActionFailedException NotFound(string code) => new(code, FailureKind.NotFound);

    public static ActionFailedException Conflict(string code) => new(code, FailureKind.Conflict);
}
