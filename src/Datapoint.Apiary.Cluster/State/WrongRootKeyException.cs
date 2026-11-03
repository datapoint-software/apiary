namespace Datapoint.Apiary.Cluster.State;

public sealed class WrongRootKeyException : Exception
{
    public WrongRootKeyException()
        : base("The state's data keys can't be decrypted with this root key. Mount the root key this cluster was created with.")
    {
    }

    public WrongRootKeyException(string message)
        : base(message)
    {
    }

    public WrongRootKeyException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}
