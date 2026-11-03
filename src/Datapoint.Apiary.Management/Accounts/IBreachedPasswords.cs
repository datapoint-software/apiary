namespace Datapoint.Apiary.Management.Accounts;

public interface IBreachedPasswords
{
    ValueTask<bool> IsBreachedAsync(string password, CancellationToken cancellationToken);
}
