using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Apiary.Security.Passwords;

namespace Datapoint.Apiary.Management.Account;

public sealed class PasswordConfirmation(SignInThrottle throttle, IRequestOrigin origin)
{
    public void Require(User user, string password, string field)
    {
        var key = string.Concat(user.Email, "|", origin.Address);
        throttle.EnsureAllowed(key);
        if (!PasswordHasher.Verify(password, user.PasswordHash))
        {
            throttle.Failed(key);
            throw FieldErrors.For(field, ErrorCodes.PasswordIncorrect);
        }

        throttle.Succeeded(key);
    }
}
