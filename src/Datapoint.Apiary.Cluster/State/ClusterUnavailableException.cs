namespace Datapoint.Apiary.Cluster.State;

public sealed class ClusterUnavailableException : Exception
{
    public ClusterUnavailableException()
        : base("The cluster has no leader with a majority, so changes can't be saved.")
    {
    }

    public ClusterUnavailableException(string message)
        : base(message)
    {
    }

    public ClusterUnavailableException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}
