using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Apiary.Security.Passwords;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Account;

public sealed class ChangePasswordHandler(
    StateTransaction transaction,
    CurrentUser current,
    Sessions sessions,
    SignInThrottle throttle,
    IRequestOrigin origin) : ICommandHandler<ChangePassword, int>
{
    public ValueTask<int> HandleAsync(ChangePassword command, CancellationToken ct = default)
    {
        var user = current.Require(transaction.State);
        var key = string.Concat(user.Email, "|", origin.Address);
        throttle.EnsureAllowed(key);
        if (!PasswordHasher.Verify(command.Current, user.PasswordHash))
        {
            throttle.Failed(key);
            throw FieldErrors.For(nameof(ChangePassword.Current), ErrorCodes.PasswordIncorrect);
        }

        if (PasswordPolicy.Check(command.Next, user.Email) is PasswordProblem.ContainsEmail)
        {
            throw FieldErrors.For(nameof(ChangePassword.Next), ErrorCodes.PasswordContainsEmail);
        }

        throttle.Succeeded(key);
        var others = transaction.State.Sessions.Values.Count(s => s.UserId == user.Id && s.Id != current.SessionId);
        transaction.Record(new UserSaved(user with { PasswordHash = PasswordHasher.Hash(command.Next) }));
        sessions.EndAll(user.Id, except: current.SessionId);
        transaction.Affects(user.Id);
        return new(others);
    }
}
