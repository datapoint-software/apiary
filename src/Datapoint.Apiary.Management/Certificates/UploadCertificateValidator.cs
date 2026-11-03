using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;
using FluentValidation;

namespace Datapoint.Apiary.Management.Certificates;

public sealed class UploadCertificateValidator : AbstractValidator<UploadCertificate>
{
    public UploadCertificateValidator(IClusterState cluster, TimeProvider time)
    {
        RuleFor(u => u.ProjectId)
            .Must(id => cluster.Current.Projects.ContainsKey(id)).WithErrorCode(ErrorCodes.ProjectNotFound);
        this.AddUploadRules(cluster, time);
    }
}
