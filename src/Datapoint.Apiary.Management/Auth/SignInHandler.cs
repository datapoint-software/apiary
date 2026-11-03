using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Audit;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Apiary.Security.Passwords;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Auth;

public sealed class SignInHandler(
    IClusterState cluster,
    SignInThrottle throttle,
    Challenges challenges,
    AuditLog audit,
    IRequestOrigin origin) : IQueryHandler<SignIn, SignInStep>
{
    public async ValueTask<SignInStep> HandleAsync(SignIn query, CancellationToken ct = default)
    {
        var email = Emails.Normalize(query.Email);
        var key = string.Concat(email, "|", origin.Address);
        throttle.EnsureAllowed(key);
        var user = UserLookup.ByEmail(cluster.Current, email);
        var valid = PasswordHasher.Verify(query.Password, user?.PasswordHash) && user is { Status: UserStatus.Active };
        if (!valid || user is null)
        {
            if (throttle.Failed(key) == SignInThrottle.AuditedFailures)
            {
                await audit.RecordAsync("auth.sign-in", AuditOutcome.Failed, email, user is null ? [] : [user.Id.ToString()], ct);
            }

            throw ActionFailedException.Invalid(ErrorCodes.SignInFailed);
        }

        throttle.Succeeded(key);
        return user.TwoStep is null
            ? Enroll(user)
            : new SignInStep(SignInNext.Code, challenges.Issue(ChallengePurpose.SignIn, user.Id, user.Email), Enrollment: null);
    }

    private SignInStep Enroll(User user)
    {
        var enrollment = challenges.Enroll(ChallengePurpose.Enroll, user.Id, user.Email);
        return new SignInStep(SignInNext.Enroll, enrollment.Challenge, enrollment);
    }
}
