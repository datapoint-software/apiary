namespace Datapoint.Apiary.Cluster.Recovery;

public sealed class RecoveryRefusedException : Exception
{
    public RecoveryRefusedException()
    {
    }

    public RecoveryRefusedException(string message)
        : base(message)
    {
    }

    public RecoveryRefusedException(string message, Exception innerException)
        : base(message, innerException)
    {
    }

    public string Code { get; init; } = "";
}
