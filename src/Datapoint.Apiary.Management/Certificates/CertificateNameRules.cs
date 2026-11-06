using Datapoint.Apiary.Certificates.DnsProviders;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;
using FluentValidation;

namespace Datapoint.Apiary.Management.Certificates;

public static class CertificateNameRules
{
    public static IRuleBuilderOptions<T, Guid?> ProvesEveryName<T>(this IRuleBuilderInitial<T, Guid?> rule, IClusterState cluster, Func<T, IReadOnlyList<string>> names) =>
        rule.Cascade(CascadeMode.Stop)
            .Must((item, id) => id is not null || !names(item).Any(CertificateNames.IsWildcard)).WithErrorCode(ErrorCodes.CertificateWildcardNeedsDns)
            .Must(id => id is null || cluster.Current.DnsProviders.ContainsKey(id.Value)).WithErrorCode(ErrorCodes.DnsProviderNotFound)
            .Must((item, id) => id is null || names(item).All(n => DnsChallengeWriter.Covers(cluster.Current.DnsProviders[id.Value], n)))
            .WithErrorCode(ErrorCodes.CertificateProviderDoesNotCover);
}
