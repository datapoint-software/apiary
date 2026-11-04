using Datapoint.Apiary.Cluster.Agents;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Testing.Builders;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Cluster.Tests.Agents;

public sealed class AgentChangesTests
{
    [Fact]
    public void Saving_an_agent_adds_it()
    {
        var agent = AnAgent(AnId());

        var state = ApiaryState.Empty.With(new AgentSaved(agent));

        Assert.Same(agent, state.Agents[agent.Id]);
    }

    [Fact]
    public void Removing_agents_removes_only_those_agents()
    {
        var userId = AnId();
        var kept = AnAgent(userId);
        var removed = AnAgent(userId);

        var state = ApiaryState.Empty.With(new AgentSaved(kept), new AgentSaved(removed), new AgentsRemoved([removed.Id]));

        Assert.Equal([kept.Id], state.Agents.Keys);
    }

    [Fact]
    public void No_origins_are_trusted_by_default() =>
        Assert.Empty(AgentPolicy.TrustedOriginsOf(ApiaryState.Empty));

    [Fact]
    public void The_saved_policy_s_origins_are_trusted() =>
        Assert.Equal(["https://claude.ai"], AgentPolicy.TrustedOriginsOf(ApiaryState.Empty.With(new AgentPolicySaved(new AgentPolicy(["https://claude.ai"])))));
}
