using Datapoint.Apiary.Certificates.Bundles;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Certificates;

public sealed class CheckCertificateHandler(TimeProvider time) : IQueryHandler<CheckCertificate, CertificatePreview>
{
    public ValueTask<CertificatePreview> HandleAsync(CheckCertificate query, CancellationToken ct = default)
    {
        var material = CertificateBundle.Check(query.ChainPem, query.KeyPem, time.GetUtcNow()).Material!;
        return new(new CertificatePreview(material.Hosts, material.Issuer, material.NotBefore, material.NotAfter, material.ChainLength));
    }
}
