using Datapoint.Apiary.Cluster.State;
using FluentValidation;

namespace Datapoint.Apiary.Management.DnsProviders;

public sealed class AddDnsProviderValidator : AbstractValidator<AddDnsProvider>
{
    public AddDnsProviderValidator(IClusterState cluster) => this.AddDnsProviderRules(cluster, _ => null);
}
