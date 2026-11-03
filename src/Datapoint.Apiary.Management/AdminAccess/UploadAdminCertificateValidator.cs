using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Certificates;
using FluentValidation;

namespace Datapoint.Apiary.Management.AdminAccess;

public sealed class UploadAdminCertificateValidator : AbstractValidator<UploadAdminCertificate>
{
    public UploadAdminCertificateValidator(IClusterState cluster, TimeProvider time) => this.AddUploadRules(cluster, time);
}
