using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Audit;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Apiary.Management.Validation;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.SingleSignOn;

public sealed class SignInWithSsoHandler(
    StateTransaction transaction,
    SsoAssertions assertions,
    Sessions sessions,
    AuditLog audit,
    TimeProvider time) : ICommandHandler<SignInWithSso>
{
    public async ValueTask HandleAsync(SignInWithSso command, CancellationToken cancellationToken = default)
    {
        var identity = assertions.Open(command.Assertion);
        var settings = transaction.State.SingleSignOn;
        if (settings is not { Enabled: true } || settings.Issuer != identity.Issuer)
        {
            throw ActionFailedException.Invalid(ErrorCodes.SsoOff);
        }

        var email = Emails.Normalize(identity.Email);
        if (email.Length > 254 || email.IndexOf('@', StringComparison.Ordinal) is < 1)
        {
            throw ActionFailedException.Invalid(ErrorCodes.SsoNoEmail);
        }

        if (SsoRoles.Map(settings, identity.Groups) is not { } role)
        {
            await audit.RecordAsync("auth.sso", AuditOutcome.Failed, email, [], cancellationToken);
            throw ActionFailedException.Forbidden(ErrorCodes.SsoNoRole);
        }

        var user = Find(identity, email) ?? Create(identity, email, role);
        if (user.Status is not UserStatus.Active)
        {
            await audit.RecordAsync("auth.sso", AuditOutcome.Failed, email, [user.Id.ToString()], cancellationToken);
            throw ActionFailedException.Forbidden(ErrorCodes.SsoDisabled);
        }

        sessions.Start(user with { Name = Name(identity, email), Email = email, Role = role });
    }

    private User? Find(SsoIdentity identity, string email)
    {
        var user = transaction.State.Users.Values.FirstOrDefault(u => u.ExternalId == identity.ExternalId);
        if (UserLookup.IsEmailTaken(transaction.State, email, except: user?.Id))
        {
            throw ActionFailedException.Conflict(ErrorCodes.SsoEmailTaken);
        }

        return user;
    }

    private User Create(SsoIdentity identity, string email, Role role) =>
        new(Guid.CreateVersion7(time.GetUtcNow()), Name(identity, email), email, role, UserStatus.Active, null, null, null, time.GetUtcNow(), null)
        {
            ExternalId = identity.ExternalId,
        };

    private static string Name(SsoIdentity identity, string email)
    {
        var name = new string([.. identity.Name.Where(c => !char.IsControl(c))]).Trim();
        return name.Length == 0 ? email : name[..Math.Min(name.Length, AccountRules.MaximumNameLength)];
    }
}
