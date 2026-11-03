using System.Collections.Concurrent;
using System.Net.Http.Json;
using System.Security.Cryptography;
using Datapoint.Apiary.Cluster.Acme;

namespace Datapoint.Apiary.Certificates.Acme;

public sealed class AcmeClient(HttpClient http, TimeProvider time) : IAcmeClient
{
    private const string PemChain = "application/pem-certificate-chain";
    private static readonly TimeSpan s_pollTimeout = TimeSpan.FromMinutes(3);
    private static readonly TimeSpan s_pollInterval = TimeSpan.FromSeconds(2);
    private readonly ConcurrentDictionary<string, AcmeDirectory> _directories = new(StringComparer.Ordinal);

    public Task<AcmeAccount> CreateAccountAsync(string directoryUrl, string? email, CancellationToken cancellationToken) =>
        GuardAsync(async () =>
        {
            using var key = ECDsa.Create(ECCurve.NamedCurves.nistP256);
            var session = new AcmeSession(http, await DirectoryAsync(directoryUrl, cancellationToken), key, accountUrl: null);
            var contact = string.IsNullOrWhiteSpace(email) ? null : new[] { "mailto:" + email.Trim() };
            using var response = await session.PostAsync(session.Directory.NewAccount, new AcmeNewAccount(true, contact), AcmeJsonContext.Default.AcmeNewAccount, cancellationToken);
            var location = response.Headers.Location ?? throw new AcmeException(AcmeErrors.Rejected, "The ACME server gave no account URL.");
            return new AcmeAccount(directoryUrl, key.ExportPkcs8PrivateKeyPem(), location.ToString(), time.GetUtcNow());
        });

    public Task<AcmeOrder> OrderAsync(AcmeAccount account, string host, CancellationToken cancellationToken) =>
        GuardAsync(async () =>
        {
            using var key = Key(account);
            var session = await SessionAsync(account, key, cancellationToken);
            var request = new AcmeNewOrder([new AcmeIdentifier("dns", host)]);
            using var response = await session.PostAsync(session.Directory.NewOrder, request, AcmeJsonContext.Default.AcmeNewOrder, cancellationToken);
            var order = await AcmeSession.ReadAsync(response, AcmeJsonContext.Default.AcmeOrderResource, cancellationToken);
            var orderUrl = response.Headers.Location ?? throw new AcmeException(AcmeErrors.Rejected, "The ACME server gave no order URL.");
            var thumbprint = AcmeSession.Thumbprint(key);
            var challenges = new List<AcmePendingChallenge>();
            foreach (var authorizationUrl in order.Authorizations)
            {
                var authorization = await session.FetchAsync(authorizationUrl, AcmeJsonContext.Default.AcmeAuthorization, cancellationToken);
                if (authorization.Status == "valid")
                {
                    continue;
                }

                var challenge = authorization.Challenges.FirstOrDefault(c => c.Type == "http-01" && c.Token is not null)
                    ?? throw new AcmeException(AcmeErrors.Rejected, "The ACME server offered no HTTP-01 challenge.");
                challenges.Add(new AcmePendingChallenge(authorization.Identifier.Value, challenge.Token!, challenge.Token + "." + thumbprint, challenge.Url, authorizationUrl));
            }

            return new AcmeOrder(orderUrl, order.Finalize, challenges);
        });

    public Task<string> CompleteAsync(AcmeAccount account, AcmeOrder order, byte[] csr, CancellationToken cancellationToken) =>
        GuardAsync(async () =>
        {
            using var key = Key(account);
            var session = await SessionAsync(account, key, cancellationToken);
            foreach (var challenge in order.Challenges)
            {
                using var accepted = await session.PostAsync(challenge.ChallengeUrl, new AcmeEmpty(), AcmeJsonContext.Default.AcmeEmpty, cancellationToken);
            }

            foreach (var challenge in order.Challenges)
            {
                await WaitForAuthorizationAsync(session, challenge.AuthorizationUrl, cancellationToken);
            }

            using (await session.PostAsync(order.FinalizeUrl, new AcmeFinalize(Security.Tokens.Base64Url.Encode(csr)), AcmeJsonContext.Default.AcmeFinalize, cancellationToken))
            {
            }

            var certificateUrl = await WaitForCertificateAsync(session, order.OrderUrl, cancellationToken);
            return await session.FetchTextAsync(certificateUrl, PemChain, cancellationToken);
        });

    private static ECDsa Key(AcmeAccount account)
    {
        var key = ECDsa.Create();
        key.ImportFromPem(account.KeyPem);
        return key;
    }

    private static async Task<T> GuardAsync<T>(Func<Task<T>> action)
    {
        try
        {
            return await action();
        }
        catch (HttpRequestException exception)
        {
            throw new AcmeException(AcmeErrors.Unreachable, exception.Message, exception);
        }
        catch (TaskCanceledException exception) when (exception.InnerException is TimeoutException)
        {
            throw new AcmeException(AcmeErrors.Unreachable, "The ACME server didn't answer in time.", exception);
        }
    }

    private async Task<AcmeSession> SessionAsync(AcmeAccount account, ECDsa key, CancellationToken cancellationToken) =>
        new(http, await DirectoryAsync(account.DirectoryUrl, cancellationToken), key, new Uri(account.AccountUrl));

    private async Task<AcmeDirectory> DirectoryAsync(string url, CancellationToken cancellationToken)
    {
        if (_directories.TryGetValue(url, out var cached))
        {
            return cached;
        }

        var directory = await http.GetFromJsonAsync(new Uri(url), AcmeJsonContext.Default.AcmeDirectory, cancellationToken)
            ?? throw new AcmeException(AcmeErrors.Unreachable, "The ACME directory is empty.");
        _directories[url] = directory;
        return directory;
    }

    private async Task WaitForAuthorizationAsync(AcmeSession session, Uri url, CancellationToken cancellationToken)
    {
        var deadline = time.GetUtcNow() + s_pollTimeout;
        while (time.GetUtcNow() < deadline)
        {
            var authorization = await session.FetchAsync(url, AcmeJsonContext.Default.AcmeAuthorization, cancellationToken);
            switch (authorization.Status)
            {
                case "valid":
                    return;
                case "pending" or "processing":
                    await Task.Delay(s_pollInterval, time, cancellationToken);
                    break;
                default:
                    var failed = authorization.Challenges.FirstOrDefault(c => c.Type == "http-01");
                    throw AcmeSession.ProblemException(failed?.Error, AcmeErrors.ChallengeFailed);
            }
        }

        throw new AcmeException(AcmeErrors.TimedOut, "The ACME server didn't validate the challenge in time.");
    }

    private async Task<Uri> WaitForCertificateAsync(AcmeSession session, Uri orderUrl, CancellationToken cancellationToken)
    {
        var deadline = time.GetUtcNow() + s_pollTimeout;
        while (time.GetUtcNow() < deadline)
        {
            var order = await session.FetchAsync(orderUrl, AcmeJsonContext.Default.AcmeOrderResource, cancellationToken);
            switch (order.Status)
            {
                case "valid" when order.Certificate is not null:
                    return order.Certificate;
                case "invalid":
                    throw AcmeSession.ProblemException(order.Error, AcmeErrors.Rejected);
                default:
                    await Task.Delay(s_pollInterval, time, cancellationToken);
                    break;
            }
        }

        throw new AcmeException(AcmeErrors.TimedOut, "The ACME server didn't issue the certificate in time.");
    }
}
