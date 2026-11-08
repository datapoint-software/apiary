using System.Net;
using DotNext.IO;
using DotNext.Net.Cluster.Consensus.Raft.Membership;

namespace Datapoint.Apiary.Cluster.Raft;

// The member list Raft runs with. Changes normally come from the leader, through consensus. In Swarm a
// replica that restarts gets a new address, and while there's no leader nobody can tell the others, so
// a replica swaps a moved peer's address in its own list. The peer is the same replica, with the same
// log and vote, so the voters don't change: only where to reach one of them. The version stays the
// same, so the leader's next change still replaces this one.
public sealed class LiveMemberList(string fileName) : IClusterConfigurationStorage<EndPoint>
{
    private readonly MemberAddressBook _book = new(fileName);
    private Func<IClusterConfiguration<EndPoint>, CancellationToken, ValueTask>? _handlers;

    public event Func<IClusterConfiguration<EndPoint>, CancellationToken, ValueTask> ConfigurationChanged
    {
        add
        {
            _book.ConfigurationChanged += value;
            _handlers += value;
        }

        remove
        {
            _book.ConfigurationChanged -= value;
            _handlers -= value;
        }
    }

    public async Task ReplaceAsync(IReadOnlyDictionary<IPEndPoint, IPEndPoint> moved, CancellationToken cancellationToken)
    {
        var configuration = await ((IClusterConfigurationStorage<EndPoint>)_book).LoadConfigurationAsync(cancellationToken);
        foreach (var (old, now) in moved)
        {
            configuration = configuration.Remove(old).Add(now);
        }

        MemberAddressBook.Rewrite(fileName, [.. configuration.Members.Cast<IPEndPoint>()]);
        foreach (var handler in Delegate.EnumerateInvocationList(_handlers))
        {
            await handler(configuration, cancellationToken);
        }
    }

    ValueTask<IClusterConfiguration<EndPoint>> IClusterConfigurationStorage<EndPoint>.LoadConfigurationAsync(CancellationToken token) =>
        ((IClusterConfigurationStorage<EndPoint>)_book).LoadConfigurationAsync(token);

    ValueTask<(IDataTransferObject Configuration, long Version)> IClusterConfigurationStorage.LoadConfigurationAsync(CancellationToken token) =>
        ((IClusterConfigurationStorage)_book).LoadConfigurationAsync(token);

    ValueTask<bool> IClusterConfigurationStorage.SaveConfigurationAsync<TConfiguration>(TConfiguration configuration, long configurationVersion, CancellationToken token) =>
        ((IClusterConfigurationStorage)_book).SaveConfigurationAsync(configuration, configurationVersion, token);

    public void Dispose() => _book.Dispose();
}
