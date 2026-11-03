using Datapoint.Apiary.Cluster.State;
using FluentValidation;

namespace Datapoint.Apiary.Management.Certificates;

public sealed class CheckCertificateValidator : AbstractValidator<CheckCertificate>
{
    public CheckCertificateValidator(IClusterState cluster, TimeProvider time) => this.AddUploadRules(cluster, time);
}
