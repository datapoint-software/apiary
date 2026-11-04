using Datapoint.Apiary.Management.Accounts;

namespace Datapoint.Apiary.Management.Tests.Fakes;

public sealed class FakeBreachedPasswords : IBreachedPasswords
{
    public ISet<string> Breached { get; } = new HashSet<string>(StringComparer.Ordinal);

    public ValueTask<bool> IsBreachedAsync(string password, CancellationToken cancellationToken) => new(Breached.Contains(password));
}
