namespace Datapoint.Apiary.Replication;

public sealed class ForwardedProblemException : Exception
{
    public ForwardedProblemException()
        : this(StatusCodes.Status500InternalServerError, "{}")
    {
    }

    public ForwardedProblemException(string message)
        : base(message)
    {
        Body = "{}";
    }

    public ForwardedProblemException(string message, Exception innerException)
        : base(message, innerException)
    {
        Body = "{}";
    }

    public ForwardedProblemException(int status, string body)
        : base("The leader refused the forwarded command.")
    {
        Status = status;
        Body = body;
    }

    public int Status { get; } = StatusCodes.Status500InternalServerError;

    public string Body { get; }

    public IResult ToResult() => Results.Content(Body, "application/problem+json", statusCode: Status);
}
