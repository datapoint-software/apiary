using Datapoint.Apiary.Cluster.Acme;

namespace Datapoint.Apiary.Certificates.Acme;

public interface IAcmeClient
{
    Task<AcmeAccount> CreateAccountAsync(string directoryUrl, string? email, CancellationToken cancellationToken);

    Task<AcmeOrder> OrderAsync(AcmeAccount account, string host, CancellationToken cancellationToken);

    Task<string> CompleteAsync(AcmeAccount account, AcmeOrder order, byte[] csr, CancellationToken cancellationToken);
}
