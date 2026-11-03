namespace Datapoint.Apiary.Cluster.State;

public sealed class ClusterUpgradingException : Exception
{
    public ClusterUpgradingException()
        : base("Some replicas run an older version that can't read this change yet. Try again once every replica is upgraded.")
    {
    }

    public ClusterUpgradingException(string message)
        : base(message)
    {
    }

    public ClusterUpgradingException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}
