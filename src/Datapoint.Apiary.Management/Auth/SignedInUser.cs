using Datapoint.Apiary.Cluster.Users;

namespace Datapoint.Apiary.Management.Auth;

public sealed record SignedInUser(Guid Id, string Name, string Email, Role Role, DateTimeOffset? TwoStepSetUpAt, int RecoveryCodesLeft, bool SingleSignOn);
