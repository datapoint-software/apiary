using Datapoint.Apiary.Cluster.Sessions;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Testing.Builders;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Cluster.Tests.Sessions;

public sealed class SessionChangesTests
{
    [Fact]
    public void Starting_a_session_adds_it()
    {
        var session = ASession(AnId());

        var state = ApiaryState.Empty.With(new SessionStarted(session));

        Assert.Same(session, state.Sessions[session.Id]);
    }

    [Fact]
    public void Ending_sessions_removes_only_those_sessions()
    {
        var userId = AnId();
        var kept = ASession(userId);
        var first = ASession(userId);
        var second = ASession(userId);

        var state = ApiaryState.Empty.With(new SessionStarted(kept), new SessionStarted(first), new SessionStarted(second), new SessionsEnded([first.Id, second.Id]));

        Assert.Equal([kept.Id], state.Sessions.Keys);
    }

    [Fact]
    public void Saving_the_session_policy_replaces_it() =>
        Assert.Equal(new SessionPolicy(60), ApiaryState.Empty.With(new SessionPolicySaved(new SessionPolicy(30)), new SessionPolicySaved(new SessionPolicy(60))).SessionPolicy);

    [Fact]
    public void Sessions_end_after_15_idle_minutes_by_default() =>
        Assert.Equal(TimeSpan.FromMinutes(15), SessionPolicy.IdleTimeout(ApiaryState.Empty));

    [Fact]
    public void Sessions_end_after_the_policy_s_idle_minutes() =>
        Assert.Equal(TimeSpan.FromMinutes(45), SessionPolicy.IdleTimeout(ApiaryState.Empty.With(new SessionPolicySaved(new SessionPolicy(45)))));
}
