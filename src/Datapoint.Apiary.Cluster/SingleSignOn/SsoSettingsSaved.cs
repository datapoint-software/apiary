using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.SingleSignOn;

public sealed record SsoSettingsSaved(SsoSettings Settings) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { SingleSignOn = Settings };
}
