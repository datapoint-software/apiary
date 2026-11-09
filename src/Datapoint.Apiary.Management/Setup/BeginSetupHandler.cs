using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Setup;

public sealed class BeginSetupHandler(IClusterState cluster, SetupWindow window, Challenges challenges)
    : IQueryHandler<BeginSetup, TwoStepEnrollment>
{
    public ValueTask<TwoStepEnrollment> HandleAsync(BeginSetup query, CancellationToken cancellationToken = default) =>
        window.IsOpen(cluster.Current)
            ? new(challenges.Enroll(ChallengePurpose.Setup, userId: null, Emails.Normalize(query.Email)))
            : throw ActionFailedException.Forbidden(ErrorCodes.SetupClosed);
}
