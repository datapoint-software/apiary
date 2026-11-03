namespace Datapoint.Apiary.Management.Certificates;

public interface ICertificateUpload
{
    string ChainPem { get; }

    string KeyPem { get; }

    Guid? ReplacingId { get; }
}
