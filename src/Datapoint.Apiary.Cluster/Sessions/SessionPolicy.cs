using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Sessions;

public sealed record SessionPolicy(int IdleMinutes)
{
    public const int DefaultIdleMinutes = 15;

    public static TimeSpan IdleTimeout(ApiaryState state) => TimeSpan.FromMinutes(state.SessionPolicy?.IdleMinutes ?? DefaultIdleMinutes);
}
