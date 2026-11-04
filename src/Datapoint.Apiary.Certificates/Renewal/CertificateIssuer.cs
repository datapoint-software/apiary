using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using Datapoint.Apiary.Certificates.Acme;
using Datapoint.Apiary.Certificates.Bundles;
using Datapoint.Apiary.Cluster.Acme;
using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Cluster.Locks;
using Datapoint.Apiary.Cluster.State;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Datapoint.Apiary.Certificates.Renewal;

public sealed partial class CertificateIssuer(
    IClusterState cluster,
    IAcmeClient acme,
    IOptions<AcmeOptions> options,
    TimeProvider time,
    ILogger<CertificateIssuer> logger)
{
    public const string SystemActor = "System";
    private static readonly TimeSpan s_lockLifetime = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan s_challengeLifetime = TimeSpan.FromHours(1);
    private readonly string _holder = $"{Environment.MachineName}/{Guid.NewGuid():N}";
    private readonly ConcurrentDictionary<string, bool> _issuing = new(StringComparer.OrdinalIgnoreCase);

    public async Task<IssueResult?> IssueAsync(string host, string? user, string action, CancellationToken cancellationToken)
    {
        if (!_issuing.TryAdd(host, true))
        {
            return null;
        }

        try
        {
            return await IssueAloneAsync(host, user, action, cancellationToken);
        }
        finally
        {
            _issuing.TryRemove(host, out _);
        }
    }

    private async Task<IssueResult?> IssueAloneAsync(string host, string? user, string action, CancellationToken cancellationToken)
    {
        var lockName = "certificate:" + host;
        var now = time.GetUtcNow();
        if (IsHeldByOther(lockName, now))
        {
            return null;
        }

        var existing = RenewalPlan.Automatic(cluster.Current, host);
        var certificate = existing
            ?? new Certificate(Guid.CreateVersion7(now), CertificateSource.Automatic, host, null, null, [], null, 0, null, now, user);
        var taken = new LockTaken(new StateLock(lockName, _holder, now + s_lockLifetime), now);
        await AppendAsync(existing is null ? [taken, new CertificateSaved(certificate)] : [taken], cancellationToken);
        if (cluster.Current.Locks.GetValueOrDefault(lockName)?.Holder != _holder)
        {
            return null;
        }

        IReadOnlyList<string> tokens = [];
        try
        {
            var account = await AccountAsync(cancellationToken);
            var order = await acme.OrderAsync(account, host, cancellationToken);
            tokens = [.. order.Challenges.Select(c => c.Token)];
            var expires = time.GetUtcNow() + s_challengeLifetime;
            await AppendAsync([new AcmeChallengesAdded([.. order.Challenges.Select(c => new AcmeChallenge(c.Token, c.KeyAuthorization, c.Host, expires))])], cancellationToken);
            using var key = ECDsa.Create(ECCurve.NamedCurves.nistP256);
            var chainPem = await acme.CompleteAsync(account, order, SigningRequest(host, key), cancellationToken);
            var bundle = CertificateBundle.Check(chainPem, key.ExportPkcs8PrivateKeyPem(), time.GetUtcNow(), requireCompleteChain: false);
            if (bundle.Material is null)
            {
                throw new AcmeException(AcmeErrors.Rejected, $"The issued certificate can't be used ({bundle.Problem}).");
            }

            return await SucceededAsync(certificate, bundle.Material, user, action, lockName, tokens, cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            var failure = exception as AcmeException ?? new AcmeException(AcmeErrors.Rejected, exception.Message);
            LogFailed(exception, host, failure.Code, failure.Detail);
            return await FailedAsync(certificate, failure, user, action, lockName, tokens, cancellationToken);
        }
    }

    private bool IsHeldByOther(string lockName, DateTimeOffset now) =>
        cluster.Current.Locks.TryGetValue(lockName, out var held) && held.Holder != _holder && held.ExpiresAt > now;

    private static byte[] SigningRequest(string host, ECDsa key)
    {
        var request = new CertificateRequest("CN=" + host, key, HashAlgorithmName.SHA256);
        var names = new SubjectAlternativeNameBuilder();
        names.AddDnsName(host);
        request.CertificateExtensions.Add(names.Build());
        return request.CreateSigningRequest();
    }

    private async Task<AcmeAccount> AccountAsync(CancellationToken cancellationToken)
    {
        var directory = options.Value.DirectoryUrl;
        if (cluster.Current.AcmeAccounts.TryGetValue(directory, out var existing))
        {
            return existing;
        }

        var account = await acme.CreateAccountAsync(directory, options.Value.Email, cancellationToken);
        await AppendAsync([new AcmeAccountSaved(account)], cancellationToken);
        LogAccountCreated(directory);
        return account;
    }

    private async Task<IssueResult> SucceededAsync(
        Certificate certificate, CertificateMaterial material, string? user, string action, string lockName, IReadOnlyList<string> tokens, CancellationToken cancellationToken)
    {
        var now = time.GetUtcNow();
        var kind = certificate.Material is null ? CertificateEventKind.Issued : CertificateEventKind.Renewed;
        var saved = Current(certificate).WithEvent(new CertificateEvent(now, kind, null, $"{material.Issuer}, valid until {material.NotAfter:yyyy-MM-dd}", user ?? SystemActor)) with
        {
            Material = material,
            NextAttemptAt = null,
            FailedAttempts = 0,
        };
        await AppendAsync([new CertificateSaved(saved), new AcmeChallengesRemoved(tokens), new LockReleased(lockName, _holder), Audit(now, user, action, saved, AuditOutcome.Succeeded)], cancellationToken);
        LogIssued(saved.Name, material.NotAfter);
        return new IssueResult(saved, null, null);
    }

    private async Task<IssueResult> FailedAsync(
        Certificate certificate, AcmeException exception, string? user, string action, string lockName, IReadOnlyList<string> tokens, CancellationToken cancellationToken)
    {
        var now = time.GetUtcNow();
        var current = Current(certificate);
        var attempts = current.FailedAttempts + 1;
        var saved = current.WithEvent(new CertificateEvent(now, CertificateEventKind.Failed, exception.Code, exception.Detail, user ?? SystemActor)) with
        {
            FailedAttempts = attempts,
            NextAttemptAt = now + RenewalPlan.RetryAfter(attempts),
        };
        await AppendAsync([new CertificateSaved(saved), new AcmeChallengesRemoved(tokens), new LockReleased(lockName, _holder), Audit(now, user, action, saved, AuditOutcome.Failed)], cancellationToken);
        return new IssueResult(saved, exception.Code, exception.Detail);
    }

    private Certificate Current(Certificate certificate) => cluster.Current.Certificates.GetValueOrDefault(certificate.Id) ?? certificate;

    private AuditRecorded Audit(DateTimeOffset now, string? user, string action, Certificate certificate, AuditOutcome outcome) =>
        new(new AuditEntry(Guid.CreateVersion7(now), now, user, user is null ? SystemActor : null, null, action, [certificate.Name], null, outcome, UserIdOf(user)));

    private Guid? UserIdOf(string? email) =>
        email is null ? null : cluster.Current.Users.Values.FirstOrDefault(u => string.Equals(u.Email, email, StringComparison.OrdinalIgnoreCase))?.Id;

    private async Task AppendAsync(IReadOnlyList<IStateChange> changes, CancellationToken cancellationToken)
    {
        var now = time.GetUtcNow();
        await cluster.AppendAsync(new StateEntry(Guid.CreateVersion7(now), now, changes), cancellationToken);
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Created an ACME account at {Directory}")]
    private partial void LogAccountCreated(string directory);

    [LoggerMessage(Level = LogLevel.Information, Message = "Got a certificate for {Host}, valid until {NotAfter:u}")]
    private partial void LogIssued(string host, DateTimeOffset notAfter);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Couldn't get a certificate for {Host}: {Code} {Detail}")]
    private partial void LogFailed(Exception exception, string host, string code, string? detail);
}
