using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Validation;
using FluentValidation;

namespace Datapoint.Apiary.Management.Proxies;

public static class TrustedProxyRules
{
    /// <summary>Stop on the first failure, with <c>Cascade(CascadeMode.Stop)</c> on the rule, so each range gets one error.</summary>
    public static IRuleBuilderOptions<T, string> TrustedProxyRange<T>(this IRuleBuilder<T, string> rule, IClusterState cluster, Func<T, Guid?> except) =>
        rule
            .Must(range => !string.IsNullOrWhiteSpace(range)).WithErrorCode(ErrorCodes.Required)
            .Must(range => RuleExtensions.IsIpRange(range.Trim())).WithErrorCode(ErrorCodes.IpRangeInvalid)
            .Must(range => !TrustedProxyRanges.IsEverything(range)).WithErrorCode(ErrorCodes.TrustedProxyEverything)
            .Must((item, range) => !TrustedProxyRanges.IsListed(cluster.Current, range, except(item))).WithErrorCode(ErrorCodes.TrustedProxyDuplicate);

    public static IRuleBuilderOptions<T, string?> TrustedProxyNote<T>(this IRuleBuilderInitial<T, string?> rule) =>
        rule.Must(note => (note?.Trim().Length ?? 0) <= TrustedProxyRanges.MaximumNoteLength).WithErrorCode(ErrorCodes.TooLong);
}
