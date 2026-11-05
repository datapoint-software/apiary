using Datapoint.Apiary.Cluster.State;
using FluentValidation;

namespace Datapoint.Apiary.Management.Proxies;

public sealed class UpdateTrustedProxyValidator : AbstractValidator<UpdateTrustedProxy>
{
    public UpdateTrustedProxyValidator(IClusterState cluster)
    {
        RuleFor(p => p.Range).Cascade(CascadeMode.Stop).TrustedProxyRange(cluster, p => p.Id);
        RuleFor(p => p.Note).TrustedProxyNote();
    }
}
