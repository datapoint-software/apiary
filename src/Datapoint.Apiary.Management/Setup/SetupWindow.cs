using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Management.Setup;

public sealed class SetupWindow(TimeProvider time)
{
    public static readonly TimeSpan Duration = TimeSpan.FromMinutes(15);

    public DateTimeOffset ClosesAt { get; } = time.GetUtcNow() + Duration;

    public bool IsOpen(ApiaryState state) => !state.SetupCompleted && state.Users.IsEmpty && time.GetUtcNow() < ClosesAt;
}
