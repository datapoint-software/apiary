namespace Datapoint.Apiary.Management.Agents;

public static class AgentLifetimes
{
    public const int MaxPerUser = 20;

    public static readonly TimeSpan Code = TimeSpan.FromMinutes(2);
    public static readonly TimeSpan Access = TimeSpan.FromHours(1);
    public static readonly TimeSpan Refresh = TimeSpan.FromDays(30);
    public static readonly TimeSpan Connection = TimeSpan.FromDays(90);
}
