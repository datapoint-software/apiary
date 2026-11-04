using Datapoint.Apiary.Certificates.Acme;
using Datapoint.Apiary.Cluster.Acme;
using Datapoint.Apiary.Testing.Certificates;
using Microsoft.Extensions.Time.Testing;

namespace Datapoint.Apiary.Certificates.Tests.Fakes;

public sealed class FakeAcme(FakeTimeProvider time) : IAcmeClient, IDisposable
{
    private readonly TestAuthority _authority = new("Fake LE");

    public int AccountsCreated { get; private set; }

    public IList<string> Ordered { get; } = [];

    public AcmeException? Failure { get; set; }

    public TimeSpan Lifetime { get; set; } = TimeSpan.FromDays(90);

    public Func<Task>? WhileCompleting { get; set; }

    public Task<AcmeAccount> CreateAccountAsync(string directoryUrl, string? email, CancellationToken cancellationToken)
    {
        AccountsCreated++;
        return Task.FromResult(new AcmeAccount(directoryUrl, "account-key", "https://acme.test/account/" + AccountsCreated, time.GetUtcNow()));
    }

    public Task<AcmeOrder> OrderAsync(AcmeAccount account, string host, CancellationToken cancellationToken)
    {
        Ordered.Add(host);
        var challenge = new AcmePendingChallenge(host, "token-" + Ordered.Count, "token-" + Ordered.Count + ".thumbprint", new Uri("https://acme.test/chall"), new Uri("https://acme.test/authz"));
        return Task.FromResult(new AcmeOrder(new Uri("https://acme.test/order"), new Uri("https://acme.test/finalize"), [challenge]));
    }

    public async Task<string> CompleteAsync(AcmeAccount account, AcmeOrder order, byte[] csr, CancellationToken cancellationToken)
    {
        if (WhileCompleting is { } during)
        {
            await during();
        }

        if (Failure is { } failure)
        {
            throw failure;
        }

        var now = time.GetUtcNow();
        return _authority.Sign(csr, now.AddMinutes(-1), now + Lifetime);
    }

    public void Dispose() => _authority.Dispose();
}
