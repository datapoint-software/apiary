using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;
using FluentValidation;

namespace Datapoint.Apiary.Management.Proxies;

public sealed class AddTrustedProxyValidator : AbstractValidator<AddTrustedProxy>
{
    public AddTrustedProxyValidator(IClusterState cluster)
    {
        RuleFor(p => p.Range).Cascade(CascadeMode.Stop)
            .Must(_ => cluster.Current.TrustedProxies.Count < TrustedProxyRanges.MaximumProxies).WithErrorCode(ErrorCodes.IpRangeTooMany)
            .TrustedProxyRange(cluster, _ => null);
        RuleFor(p => p.Note).TrustedProxyNote();
    }
}
