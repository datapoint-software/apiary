using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using Datapoint.Apiary.Certificates.Acme;
using Datapoint.Apiary.Certificates.Bundles;
using Datapoint.Apiary.Certificates.Dns;
using Datapoint.Apiary.Certificates.DnsProviders;
using Datapoint.Apiary.Cluster.Acme;
using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Cluster.DnsProviders;
using Datapoint.Apiary.Cluster.Locks;
using Datapoint.Apiary.Cluster.State;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Datapoint.Apiary.Certificates.Renewal;

public sealed partial class CertificateIssuer(
    IClusterState cluster,
    IAcmeClient acme,
    DnsChallengeWriter dns,
    DnsChallengeCleanup cleanup,
    IOptions<AcmeOptions> options,
    TimeProvider time,
    ILogger<CertificateIssuer> logger)
{
    public const string SystemActor = "System";
    public static readonly TimeSpan ChallengeLifetime = TimeSpan.FromHours(1);
    private static readonly TimeSpan s_lockLifetime = TimeSpan.FromMinutes(10);
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

        var published = new Published();
        try
        {
            var material = await ObtainAsync(certificate, published, cancellationToken);
            return await SucceededAsync(certificate, material, new Outcome(user, action, lockName, published), cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            var (code, detail) = Failure(exception);
            LogFailed(exception, host, code, detail);
            return await FailedAsync(certificate, code, detail, new Outcome(user, action, lockName, published), cancellationToken);
        }
    }

    private async Task<CertificateMaterial> ObtainAsync(Certificate certificate, Published published, CancellationToken cancellationToken)
    {
        var account = await AccountAsync(cancellationToken);
        var provider = ProviderOf(certificate);
        var order = await acme.OrderAsync(account, certificate.Names, provider is null ? AcmeChallengeType.Http01 : AcmeChallengeType.Dns01, cancellationToken);
        if (provider is null)
        {
            await PublishTokensAsync(order, published, cancellationToken);
        }
        else
        {
            await PublishRecordsAsync(provider, order, published, cancellationToken);
        }

        using var key = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        var chainPem = await acme.CompleteAsync(account, order, SigningRequest(certificate.Names, key), cancellationToken);
        var bundle = CertificateBundle.Check(chainPem, key.ExportPkcs8PrivateKeyPem(), time.GetUtcNow(), requireCompleteChain: false);
        return bundle.Material ?? throw new AcmeException(AcmeErrors.Rejected, $"The issued certificate can't be used ({bundle.Problem}).");
    }

    private DnsProvider? ProviderOf(Certificate certificate) => certificate.DnsProviderId is { } id
        ? cluster.Current.DnsProviders.GetValueOrDefault(id) ?? throw new DnsException(DnsErrors.ZoneNotFound, "The certificate's DNS provider was removed.")
        : null;

    private async Task PublishTokensAsync(AcmeOrder order, Published published, CancellationToken cancellationToken)
    {
        published.Tokens.AddRange(order.Challenges.Select(c => c.Token));
        var expires = time.GetUtcNow() + ChallengeLifetime;
        await AppendAsync([new AcmeChallengesAdded([.. order.Challenges.Select(c => new AcmeChallenge(c.Token, c.KeyAuthorization, c.Host, expires))])], cancellationToken);
    }

    private async Task PublishRecordsAsync(DnsProvider provider, AcmeOrder order, Published published, CancellationToken cancellationToken)
    {
        var records = order.Challenges.Select(c => (Target: DnsChallengeWriter.Target(provider, c.Host), Value: DnsNames.ChallengeValue(c.KeyAuthorization))).ToList();
        foreach (var target in records.Select(r => r.Target).DistinctBy(t => t.RecordName, StringComparer.OrdinalIgnoreCase))
        {
            await dns.CheckDelegationAsync(target, cancellationToken);
        }

        var expires = time.GetUtcNow() + ChallengeLifetime;
        foreach (var (target, value) in records)
        {
            var record = new DnsChallengeRecord(target.RecordName, value, target.Zone, provider.Id, expires);
            await AppendAsync([new DnsChallengeRecordsAdded([record])], cancellationToken);
            published.Records.Add(record);
            await dns.AddAsync(provider, target, value, cancellationToken);
        }

        foreach (var (target, value) in records)
        {
            var waited = await dns.WaitAsync(target, value, cancellationToken);
            LogPropagated(target.RecordName, waited);
        }
    }

    private static (string Code, string? Detail) Failure(Exception exception) => exception switch
    {
        AcmeException acmeFailure => (acmeFailure.Code, acmeFailure.Detail),
        DnsException dnsFailure => (dnsFailure.Code, dnsFailure.Detail),
        _ => (AcmeErrors.Rejected, exception.Message),
    };

    private bool IsHeldByOther(string lockName, DateTimeOffset now) =>
        cluster.Current.Locks.TryGetValue(lockName, out var held) && held.Holder != _holder && held.ExpiresAt > now;

    private static byte[] SigningRequest(IReadOnlyList<string> names, ECDsa key)
    {
        var request = new CertificateRequest("CN=" + names[0], key, HashAlgorithmName.SHA256);
        var alternativeNames = new SubjectAlternativeNameBuilder();
        foreach (var name in names)
        {
            alternativeNames.AddDnsName(name);
        }

        request.CertificateExtensions.Add(alternativeNames.Build());
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

    private async Task<IssueResult> SucceededAsync(Certificate certificate, CertificateMaterial material, Outcome outcome, CancellationToken cancellationToken)
    {
        var now = time.GetUtcNow();
        var kind = certificate.Material is null ? CertificateEventKind.Issued : CertificateEventKind.Renewed;
        var saved = Current(certificate).WithEvent(new CertificateEvent(now, kind, null, $"{material.Issuer}, valid until {material.NotAfter:yyyy-MM-dd}", outcome.User ?? SystemActor)) with
        {
            Material = material,
            NextAttemptAt = null,
            FailedAttempts = 0,
        };
        await FinishAsync(saved, outcome, AuditOutcome.Succeeded, cancellationToken);
        LogIssued(saved.Name, material.NotAfter);
        return new IssueResult(saved, null, null);
    }

    private async Task<IssueResult> FailedAsync(Certificate certificate, string code, string? detail, Outcome outcome, CancellationToken cancellationToken)
    {
        var now = time.GetUtcNow();
        var current = Current(certificate);
        var attempts = current.FailedAttempts + 1;
        var saved = current.WithEvent(new CertificateEvent(now, CertificateEventKind.Failed, code, detail, outcome.User ?? SystemActor)) with
        {
            FailedAttempts = attempts,
            NextAttemptAt = now + RenewalPlan.RetryAfter(attempts, code),
        };
        await FinishAsync(saved, outcome, AuditOutcome.Failed, cancellationToken);
        return new IssueResult(saved, code, detail);
    }

    private async Task FinishAsync(Certificate saved, Outcome outcome, AuditOutcome result, CancellationToken cancellationToken)
    {
        var removedRecords = await cleanup.RemoveAsync(outcome.Published.Records, cancellationToken);
        List<IStateChange> changes =
        [
            new CertificateSaved(saved),
            new AcmeChallengesRemoved(outcome.Published.Tokens),
            new LockReleased(outcome.LockName, _holder),
            Audit(time.GetUtcNow(), outcome.User, outcome.Action, saved, result),
        ];
        if (removedRecords.Count > 0)
        {
            changes.Add(new DnsChallengeRecordsRemoved(removedRecords));
        }

        await AppendAsync(changes, cancellationToken);
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

    [LoggerMessage(Level = LogLevel.Information, Message = "Every name server showed the TXT record at {Name} after {Waited}")]
    private partial void LogPropagated(string name, TimeSpan waited);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Couldn't get a certificate for {Host}: {Code} {Detail}")]
    private partial void LogFailed(Exception exception, string host, string code, string? detail);

    private sealed class Published
    {
        public List<string> Tokens { get; } = [];

        public List<DnsChallengeRecord> Records { get; } = [];
    }

    private sealed record Outcome(string? User, string Action, string LockName, Published Published);
}
