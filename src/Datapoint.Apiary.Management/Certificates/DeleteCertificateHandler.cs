using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Certificates;

public sealed class DeleteCertificateHandler(StateTransaction transaction) : ICommandHandler<DeleteCertificate>
{
    public ValueTask HandleAsync(DeleteCertificate command, CancellationToken cancellationToken = default)
    {
        var certificate = CertificateGuards.Find(transaction.State, command.Id);
        var routes = CertificateUsage.Routes(transaction.State, certificate).Count;
        if (routes > 0)
        {
            throw new ActionFailedException(ErrorCodes.CertificateInUse, FailureKind.Conflict)
            {
                Params = new Dictionary<string, object?>(StringComparer.Ordinal) { ["routes"] = routes },
            };
        }

        transaction.Record(new CertificateDeleted(certificate.Id));
        transaction.Affects(certificate.Id, certificate.ProjectId);
        return ValueTask.CompletedTask;
    }
}
