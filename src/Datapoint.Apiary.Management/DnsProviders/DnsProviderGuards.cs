using Datapoint.Apiary.Cluster.DnsProviders;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;

namespace Datapoint.Apiary.Management.DnsProviders;

public static class DnsProviderGuards
{
    public static DnsProvider Find(ApiaryState state, Guid id) =>
        state.DnsProviders.TryGetValue(id, out var provider)
            ? provider
            : throw ActionFailedException.NotFound(ErrorCodes.DnsProviderNotFound);
}
