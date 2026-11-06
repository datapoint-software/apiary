using Datapoint.Apiary.Certificates.Renewal;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;
using FluentValidation;

namespace Datapoint.Apiary.Management.Certificates;

public sealed class RequestCertificateValidator : AbstractValidator<RequestCertificate>
{
    public RequestCertificateValidator(IClusterState cluster)
    {
        RuleFor(r => r.Names).Cascade(CascadeMode.Stop)
            .Must(names => names is { Count: > 0 }).WithErrorCode(ErrorCodes.Required)
            .Must(names => names.Count <= CertificateNames.MaximumNames).WithErrorCode(ErrorCodes.CertificateNamesTooMany)
            .Must(names => names.All(CertificateNames.IsName)).WithErrorCode(ErrorCodes.CertificateNameInvalid)
            .Must(names => RenewalPlan.Automatic(cluster.Current, CertificateNames.Normalize(names)[0]) is null).WithErrorCode(ErrorCodes.CertificateExists);
        RuleFor(r => r.DnsProviderId).ProvesEveryName(cluster, r => CertificateNames.Normalize(r.Names))
            .When(r => r.Names is { Count: > 0 } && r.Names.All(CertificateNames.IsName));
        RuleFor(r => r.ProjectId).Must(id => cluster.Current.Projects.ContainsKey(id!.Value)).WithErrorCode(ErrorCodes.ProjectNotFound)
            .When(r => r.ProjectId is not null);
    }
}
