using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Account;

public sealed class UpdateProfileHandler(StateTransaction transaction, CurrentUser current) : ICommandHandler<UpdateProfile>
{
    public ValueTask HandleAsync(UpdateProfile command, CancellationToken ct = default)
    {
        var user = current.Require(transaction.State);
        var email = Emails.Normalize(command.Email);
        if (UserLookup.IsEmailTaken(transaction.State, email, except: user.Id))
        {
            throw FieldErrors.For(nameof(UpdateProfile.Email), ErrorCodes.EmailTaken);
        }

        transaction.Record(new UserSaved(user with { Name = command.Name.Trim(), Email = email }));
        transaction.Affects(user.Id);
        return ValueTask.CompletedTask;
    }
}
