using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;

namespace Datapoint.Apiary.Management.Certificates;

public static class CertificateGuards
{
    public static Certificate Find(ApiaryState state, Guid id) =>
        state.Certificates.TryGetValue(id, out var certificate)
            ? certificate
            : throw ActionFailedException.NotFound(ErrorCodes.CertificateNotFound);
}
