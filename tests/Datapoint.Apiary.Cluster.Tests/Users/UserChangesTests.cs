using Datapoint.Apiary.Cluster.Agents;
using Datapoint.Apiary.Cluster.Sessions;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Testing.Builders;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Cluster.Tests.Users;

public sealed class UserChangesTests
{
    [Fact]
    public void Saving_a_user_adds_them()
    {
        var user = AUser();

        var state = ApiaryState.Empty.With(new UserSaved(user));

        Assert.Same(user, state.Users[user.Id]);
    }

    [Fact]
    public void Deleting_a_user_removes_them()
    {
        var user = AUser();

        var state = ApiaryState.Empty.With(new UserSaved(user), new UserDeleted(user.Id));

        Assert.Empty(state.Users);
    }

    [Fact]
    public void Deleting_a_user_ends_their_sessions()
    {
        var user = AUser();

        var state = ApiaryState.Empty.With(new UserSaved(user), new SessionStarted(ASession(user.Id)), new UserDeleted(user.Id));

        Assert.Empty(state.Sessions);
    }

    [Fact]
    public void Deleting_a_user_disconnects_their_agents()
    {
        var user = AUser();

        var state = ApiaryState.Empty.With(new UserSaved(user), new AgentSaved(AnAgent(user.Id)), new UserDeleted(user.Id));

        Assert.Empty(state.Agents);
    }

    [Fact]
    public void Deleting_a_user_keeps_other_users_sessions()
    {
        var deleted = AUser();
        var kept = AUser("bea@example.com");
        var session = ASession(kept.Id);

        var state = ApiaryState.Empty.With(new UserSaved(deleted), new UserSaved(kept), new SessionStarted(ASession(deleted.Id)), new SessionStarted(session), new UserDeleted(deleted.Id));

        Assert.Equal([session.Id], state.Sessions.Keys);
    }

    [Fact]
    public void Deleting_a_user_keeps_other_users_agents()
    {
        var deleted = AUser();
        var kept = AUser("bea@example.com");
        var agent = AnAgent(kept.Id);

        var state = ApiaryState.Empty.With(new AgentSaved(AnAgent(deleted.Id)), new AgentSaved(agent), new UserDeleted(deleted.Id));

        Assert.Equal([agent.Id], state.Agents.Keys);
    }

    [Fact]
    public void Completing_setup_marks_it_completed() =>
        Assert.True(ApiaryState.Empty.With(new SetupCompleted()).SetupCompleted);

    [Fact]
    public void A_new_state_hasn_t_completed_setup() =>
        Assert.False(ApiaryState.Empty.SetupCompleted);
}
