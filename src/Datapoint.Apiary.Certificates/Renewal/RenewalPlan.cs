using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Certificates.Renewal;

public static class RenewalPlan
{
    public static readonly TimeSpan KeepUnused = TimeSpan.FromDays(30);

    public static IReadOnlySet<string> WantedHosts(ApiaryState state) =>
        state.Routes.Values.Where(r => r.CertificateId is null).Select(r => r.Host).ToHashSet(StringComparer.Ordinal);

    public static Certificate? Automatic(ApiaryState state, string host) =>
        state.Certificates.Values.FirstOrDefault(c => c.Source == CertificateSource.Automatic && c.Name == host);

    public static DateTimeOffset RenewsFrom(CertificateMaterial material) =>
        material.NotAfter - ((material.NotAfter - material.NotBefore) / 3);

    public static IReadOnlyList<string> Due(ApiaryState state, DateTimeOffset now) =>
        [.. WantedHosts(state).Where(host => IsDue(Automatic(state, host), now)).Order(StringComparer.Ordinal)];

    public static TimeSpan RetryAfter(int failedAttempts) => failedAttempts switch
    {
        <= 1 => TimeSpan.FromMinutes(5),
        2 => TimeSpan.FromMinutes(15),
        3 => TimeSpan.FromHours(1),
        _ => TimeSpan.FromHours(6),
    };

    private static bool IsDue(Certificate? certificate, DateTimeOffset now) => certificate switch
    {
        null => true,
        { NextAttemptAt: { } next } when next > now => false,
        { Material: null } => true,
        { Material: { } material } => RenewsFrom(material) <= now,
    };
}
