using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Users;

public sealed class CreateAdministratorHandler(StateTransaction transaction, Invitations invitations, CurrentUser current)
    : ICommandHandler<CreateAdministrator, InviteLink>
{
    private static readonly TimeSpan s_lifetime = TimeSpan.FromMinutes(15);

    public ValueTask<InviteLink> HandleAsync(CreateAdministrator command, CancellationToken cancellationToken = default)
    {
        if (!current.IsLocalOperator)
        {
            throw ActionFailedException.Forbidden(ErrorCodes.Forbidden);
        }

        var email = Emails.Normalize(command.Email);
        if (UserLookup.IsEmailTaken(transaction.State, email))
        {
            throw FieldErrors.For(nameof(CreateAdministrator.Email), ErrorCodes.EmailTaken);
        }

        return new(invitations.Create(command.Name, email, Role.Administrator, s_lifetime));
    }
}
