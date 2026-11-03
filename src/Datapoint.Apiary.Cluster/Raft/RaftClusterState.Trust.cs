using System.Security.Cryptography;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Cluster.Trust;
using Microsoft.Extensions.Logging;

namespace Datapoint.Apiary.Cluster.Raft;

public sealed partial class RaftClusterState
{
    private static readonly TimeSpan s_renewBefore = TimeSpan.FromDays(30);
    private readonly Lock _credentialsLock = new();

    public void RefreshCredentials()
    {
        var state = Current;
        if (!IsReady || Credentials is not { } credentials || state.ClusterCa is not { } ca)
        {
            return;
        }

        lock (_credentialsLock)
        {
            var trusted = TrustedAuthorities(state);
            var now = time.GetUtcNow();
            if (!credentials.IsIssuedBy(ca.CertificatePem) || credentials.NotAfter - now < s_renewBefore)
            {
                using var key = ECDsa.Create(ECCurve.NamedCurves.nistP256);
                UseCredentials(new ReplicaCredentials(key, ClusterAuthority.Issue(ca, key.ExportSubjectPublicKeyInfo(), Identity!.Id, now), trusted));
                LogCertificateRenewed(Credentials!.NotAfter);
            }
            else if (credentials.AuthorityPems != trusted)
            {
                UseCredentials(credentials.WithAuthorities(trusted));
            }
        }
    }

    private static string TrustedAuthorities(ApiaryState state) =>
        string.Join('\n', new[] { state.ClusterCa, state.NextClusterCa, state.RetiringClusterCa }.OfType<Replicas.ClusterCa>().Select(c => c.CertificatePem));

    private static bool ChangesTrust(StateEntry entry) => entry.Changes.Any(c => c is ClusterCaAdded or ClusterCaPromoted or ClusterCaRetired);

    [LoggerMessage(Level = LogLevel.Information, Message = "This replica now uses a new certificate from the cluster CA, valid until {NotAfter:u}")]
    private partial void LogCertificateRenewed(DateTimeOffset notAfter);
}
