using Datapoint.Apiary.Cluster.State;
using FluentValidation;

namespace Datapoint.Apiary.Management.DnsProviders;

public sealed class UpdateDnsProviderValidator : AbstractValidator<UpdateDnsProvider>
{
    public UpdateDnsProviderValidator(IClusterState cluster) => this.AddDnsProviderRules(cluster, p => p.Id);
}
