using Datapoint.Apiary.Certificates.Acme;
using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Certificates.Renewal;

public static class RenewalPlan
{
    public static readonly TimeSpan KeepUnused = TimeSpan.FromDays(30);
    private static readonly TimeSpan s_unreachableRetry = TimeSpan.FromMinutes(5);

    public static IReadOnlySet<string> WantedHosts(ApiaryState state) =>
        state.Routes.Values.Where(r => r.CertificateId is null).Select(r => r.Host)
            .Concat(state.Redirects.Values.Select(r => r.From))
            .Where(host => !IsLocal(host))
            .ToHashSet(StringComparer.Ordinal);

    public static Certificate? Automatic(ApiaryState state, string host) =>
        state.Certificates.Values.FirstOrDefault(c => c.Source == CertificateSource.Automatic && c.Name == host);

    public static DateTimeOffset RenewsFrom(CertificateMaterial material) =>
        material.NotAfter - ((material.NotAfter - material.NotBefore) / 3);

    public static IReadOnlyList<string> Due(ApiaryState state, DateTimeOffset now) =>
        [.. WantedHosts(state).Where(host => IsDue(Automatic(state, host), now)).Order(StringComparer.Ordinal)];

    public static TimeSpan RetryAfter(int failedAttempts, string code) => code == AcmeErrors.Unreachable ? s_unreachableRetry : failedAttempts switch
    {
        <= 1 => TimeSpan.FromMinutes(5),
        2 => TimeSpan.FromMinutes(15),
        3 => TimeSpan.FromHours(1),
        _ => TimeSpan.FromHours(6),
    };

    public static bool LastFailureReachedAcme(Certificate certificate) =>
        certificate.History.FirstOrDefault(e => e.Kind == CertificateEventKind.Failed)?.Code is not AcmeErrors.Unreachable;

    private static bool IsLocal(string host) =>
        host.Equals("localhost", StringComparison.OrdinalIgnoreCase) || host.EndsWith(".localhost", StringComparison.OrdinalIgnoreCase);

    private static bool IsDue(Certificate? certificate, DateTimeOffset now) => certificate switch
    {
        null => true,
        { NextAttemptAt: { } next } when next > now => false,
        { Material: null } => true,
        { Material: { } material } => RenewsFrom(material) <= now,
    };
}
