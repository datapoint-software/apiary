using System.Net;
using Datapoint.Apiary.Cluster.Raft;
using Datapoint.Apiary.Testing;
using DotNext.Net.Cluster.Consensus.Raft.Membership;

namespace Datapoint.Apiary.Cluster.Tests.Raft;

public sealed class LiveMemberListTests : IDisposable
{
    private static readonly IPEndPoint s_own = IPEndPoint.Parse("10.0.0.1:9444");
    private static readonly IPEndPoint s_before = IPEndPoint.Parse("10.0.0.2:9444");
    private static readonly IPEndPoint s_after = IPEndPoint.Parse("10.0.0.9:9444");
    private static readonly Comparer<IPEndPoint> s_endPoints = Comparer<IPEndPoint>.Create((a, b) => string.CompareOrdinal(a.ToString(), b.ToString()));
    private readonly TemporaryDirectory _directory = new();
    private readonly LiveMemberList _members;

    public LiveMemberListTests() => _members = new LiveMemberList(Path.Combine(_directory.Path, "members"));

    public void Dispose()
    {
        _members.Dispose();
        _directory.Dispose();
    }

    [Fact]
    public async Task A_moved_member_is_reached_at_its_new_address()
    {
        await SaveAsync(version: 7, s_own, s_before);

        await _members.ReplaceAsync(new Dictionary<IPEndPoint, IPEndPoint> { [s_before] = s_after }, TestContext.Current.CancellationToken);

        Assert.Equal([s_own, s_after], Members().Order(s_endPoints));
    }

    [Fact]
    public async Task Raft_hears_about_the_new_list()
    {
        await SaveAsync(version: 7, s_own, s_before);
        IReadOnlySet<EndPoint>? heard = null;
        _members.ConfigurationChanged += (configuration, _) =>
        {
            heard = configuration.Members;
            return ValueTask.CompletedTask;
        };

        await _members.ReplaceAsync(new Dictionary<IPEndPoint, IPEndPoint> { [s_before] = s_after }, TestContext.Current.CancellationToken);

        Assert.Equal([s_own, s_after], heard!.Cast<IPEndPoint>().Order(s_endPoints));
    }

    [Fact]
    public async Task The_leader_s_next_change_still_replaces_it()
    {
        await SaveAsync(version: 7, s_own, s_before);
        await _members.ReplaceAsync(new Dictionary<IPEndPoint, IPEndPoint> { [s_before] = s_after }, TestContext.Current.CancellationToken);

        var installed = await SaveAsync(version: 8, s_own);

        Assert.True(installed);
        Assert.Equal([s_own], Members());
    }

    private IReadOnlyList<IPEndPoint> Members() => MemberAddressBook.Read(Path.Combine(_directory.Path, "members"));

    private async Task<bool> SaveAsync(long version, params IPEndPoint[] members)
    {
        IClusterConfigurationStorage<EndPoint> storage = _members;
        var configuration = await storage.LoadConfigurationAsync(TestContext.Current.CancellationToken);
        foreach (var member in configuration.Members.ToList())
        {
            configuration = configuration.Remove(member);
        }

        foreach (var member in members)
        {
            configuration = configuration.Add(member);
        }

        return await storage.SaveConfigurationAsync(configuration, version, TestContext.Current.CancellationToken);
    }
}
