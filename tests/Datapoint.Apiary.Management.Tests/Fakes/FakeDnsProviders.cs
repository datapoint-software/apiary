using Datapoint.Apiary.Certificates.Dns;
using Datapoint.Apiary.Certificates.DnsProviders;
using Datapoint.Apiary.Cluster.DnsProviders;

namespace Datapoint.Apiary.Management.Tests.Fakes;

public sealed class FakeDnsProviders
{
    public IList<string> Calls { get; } = [];

    public DnsException? Failure { get; set; }

    public IEnumerable<IDnsProviderClient> Clients() => Enum.GetValues<DnsProviderKind>().Select(kind => new Client(this, kind));

    private sealed class Client(FakeDnsProviders owner, DnsProviderKind kind) : IDnsProviderClient
    {
        public DnsProviderKind Kind => kind;

        public Task AddAsync(DnsProvider provider, string zone, string name, string value, CancellationToken cancellationToken) =>
            Record($"add {provider.Name} {zone} {name}");

        public Task RemoveAsync(DnsProvider provider, string zone, string name, string value, CancellationToken cancellationToken) =>
            Record($"remove {provider.Name} {zone} {name}");

        private Task Record(string call)
        {
            owner.Calls.Add(call);
            return owner.Failure is { } failure ? Task.FromException(failure) : Task.CompletedTask;
        }
    }
}
