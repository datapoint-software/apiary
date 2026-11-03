using Datapoint.Apiary.Cluster.SingleSignOn;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.SingleSignOn;

public sealed class UpdateSsoSettingsHandler(StateTransaction transaction, Sessions sessions, TimeProvider time)
    : ICommandHandler<UpdateSsoSettings>
{
    public ValueTask HandleAsync(UpdateSsoSettings command, CancellationToken ct = default)
    {
        var current = transaction.State.SingleSignOn;
        var issuer = command.Issuer.Trim().TrimEnd('/');
        var secret = string.IsNullOrEmpty(command.ClientSecret) ? current?.ClientSecret : command.ClientSecret;
        if (string.IsNullOrEmpty(secret))
        {
            throw FieldErrors.For(nameof(UpdateSsoSettings.ClientSecret), ErrorCodes.Required);
        }

        var settings = new SsoSettings(
            command.Enabled,
            command.DisplayName.Trim(),
            issuer,
            command.ClientId.Trim(),
            secret,
            command.GroupsClaim.Trim(),
            SsoRules.Clean(command.AdministratorGroups),
            SsoRules.Clean(command.OperatorGroups),
            SsoRules.Clean(command.ViewerGroups),
            time.GetUtcNow());
        transaction.Record(new SsoSettingsSaved(settings));
        if (!settings.Enabled || (current is not null && current.Issuer != settings.Issuer))
        {
            foreach (var user in transaction.State.Users.Values.Where(u => u.ExternalId is not null))
            {
                sessions.EndAll(user.Id);
            }
        }

        return ValueTask.CompletedTask;
    }
}
