using Datapoint.Apiary.Cluster.Replicas;
using Datapoint.Apiary.Management.Replicas;

namespace Datapoint.Apiary.Management.Tests.Replicas;

public sealed class MembershipTests : IDisposable
{
    private readonly ManagementHost _host = new();

    public MembershipTests() => _host.SignedIn();

    public void Dispose() => _host.Dispose();

    [Fact]
    public async Task An_administrator_switches_to_manual_membership()
    {
        await _host.SendAsync(new UpdateMembership(MembershipMode.Manual, 30));

        Assert.Equal(new MembershipSettings(MembershipMode.Manual, 30), _host.State.Membership);
    }

    [Theory]
    [InlineData(4)]
    [InlineData(1441)]
    public async Task Missing_replicas_are_removed_after_5_minutes_to_a_day(int minutes)
    {
        Assert.Contains("RemoveMissingAfterMinutes: range", await _host.ErrorsAsync(new UpdateMembership(MembershipMode.Automatic, minutes)));
    }

    [Fact]
    public async Task An_unknown_mode_is_refused()
    {
        Assert.Contains("Mode: invalid", await _host.ErrorsAsync(new UpdateMembership((MembershipMode)7, 30)));
    }
}
