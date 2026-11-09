using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Users;

public sealed class InviteUserHandler(StateTransaction transaction, Invitations invitations) : ICommandHandler<InviteUser, InviteLink>
{
    public ValueTask<InviteLink> HandleAsync(InviteUser command, CancellationToken cancellationToken = default)
    {
        var email = Emails.Normalize(command.Email);
        if (UserLookup.IsEmailTaken(transaction.State, email))
        {
            throw FieldErrors.For(nameof(InviteUser.Email), ErrorCodes.EmailTaken);
        }

        return new(invitations.Create(command.Name, email, command.Role, Invitations.Lifetime));
    }
}
