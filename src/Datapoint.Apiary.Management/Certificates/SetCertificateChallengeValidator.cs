using Datapoint.Apiary.Certificates.Dns;
using Datapoint.Apiary.Certificates.Renewal;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;
using FluentValidation;

namespace Datapoint.Apiary.Management.Certificates;

public sealed class SetCertificateChallengeValidator : AbstractValidator<SetCertificateChallenge>
{
    public SetCertificateChallengeValidator(IClusterState cluster)
    {
        RuleFor(c => c.Name).Must(CertificateNames.IsName).WithErrorCode(ErrorCodes.CertificateNameInvalid);
        RuleFor(c => c.DnsProviderId).ProvesEveryName(cluster, c => NamesOf(cluster.Current, c.Name))
            .When(c => CertificateNames.IsName(c.Name));
    }

    public static IReadOnlyList<string> NamesOf(ApiaryState state, string name) =>
        RenewalPlan.Automatic(state, DnsNames.Normalize(name))?.Names ?? [DnsNames.Normalize(name)];
}
