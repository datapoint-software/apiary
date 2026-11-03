namespace Datapoint.Apiary.Cluster.Recovery;

public sealed class RecoveryRefusedException : Exception
{
    public const string NotNeeded = "cluster.recoveryNotNeeded";
    public const string NotMostRecent = "cluster.notMostRecent";
    public const string OtherReplica = "cluster.otherReplica";

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
