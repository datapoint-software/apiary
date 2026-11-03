using Datapoint.Apiary.Management.Accounts;

namespace Datapoint.Apiary.Accounts;

public sealed class NoBreachCheck : IBreachedPasswords
{
    public ValueTask<bool> IsBreachedAsync(string password, CancellationToken cancellationToken) => ValueTask.FromResult(false);
}
