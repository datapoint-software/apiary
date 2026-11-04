using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json;
using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.Join;
using Datapoint.Apiary.Cluster.Keys;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Cluster.Trust;
using Datapoint.Apiary.Security.Tokens;
using Microsoft.Extensions.Logging;

namespace Datapoint.Apiary.Cluster.Raft;

public sealed partial class RaftClusterState
{
    public const string RotateRootKeyAction = "keys.rotate-root-key";
    private bool _rekeying;

    private string CredentialsFile => Path.Combine(RaftDirectory, "credentials.json");

    public string RootKeyId => protocol.OwnKeys.RootKeyId;

    public SharedKeyRing? KeysFor(X509Certificate2? certificate)
    {
        var state = Current;
        return IsReady && certificate is not null && ClusterAuthority.ReplicaId(certificate) is { } id
            && (state.Replicas.ContainsKey(id) || state.ApprovedReplicas.Contains(id))
                ? encryption.Export()
                : null;
    }

    private async Task<bool> LoadKeysAsync(CancellationToken cancellationToken)
    {
        try
        {
            return await encryption.LoadAsync(StateDirectory, cancellationToken);
        }
        catch (WrongRootKeyException) when (discovery.IsSwarm && File.Exists(CredentialsFile))
        {
            _rekeying = true;
            return false;
        }
    }

    private async Task RekeyAsync(CancellationToken cancellationToken)
    {
        var saved = JsonSerializer.Deserialize(await File.ReadAllBytesAsync(CredentialsFile, cancellationToken), ClusterJsonContext.Default.SavedCredentials)
            ?? throw new InvalidDataException($"An empty {CredentialsFile}.");
        using var key = ECDsa.Create();
        key.ImportPkcs8PrivateKey(Base64Url.TryDecode(saved.Key), out _);
        var credentials = new ReplicaCredentials(key, saved.CertificatePem, saved.AuthorityPems);
        if (credentials.NotAfter <= time.GetUtcNow())
        {
            throw new WrongRootKeyException("The state can't be decrypted with the mounted root key, and this replica's certificate expired, so it can't ask the other replicas for the keys. Mount the previous root key, or remove this replica's volume so it joins as a new replica.");
        }

        UseCredentials(credentials);
        LogRekeying(RootKeyId);
        while (true)
        {
            foreach (var peer in await discovery.PeersAsync(Address!.Address, cancellationToken))
            {
                if (await FetchKeysAsync(peer, cancellationToken) is { } ring)
                {
                    await encryption.ImportAsync(StateDirectory, ring, cancellationToken);
                    await OpenLogAsync(cancellationToken);
                    LogRekeyed(peer);
                    return;
                }
            }

            await Task.Delay(s_joinRetry, time, cancellationToken);
        }
    }

    private async Task<SharedKeyRing?> FetchKeysAsync(IPAddress peer, CancellationToken cancellationToken)
    {
        try
        {
            using var response = await client.GetAsync(peer, "keys", cancellationToken);
            return response.IsSuccessStatusCode
                ? await response.Content.ReadFromJsonAsync(ClusterWireJsonContext.Default.SharedKeyRing, cancellationToken)
                : null;
        }
        catch (Exception exception) when (exception is HttpRequestException
            || (exception is OperationCanceledException && !cancellationToken.IsCancellationRequested))
        {
            return null;
        }
    }

    private void SaveCredentials(ReplicaCredentials credentials)
    {
        var saved = new SavedCredentials(Base64Url.Encode(credentials.ExportPrivateKey()), credentials.CertificatePem, credentials.AuthorityPems);
        var temporary = CredentialsFile + ".tmp";
        var fileOptions = new FileStreamOptions { Mode = FileMode.Create, Access = FileAccess.Write };
        if (!OperatingSystem.IsWindows())
        {
            fileOptions.UnixCreateMode = UnixFileMode.UserRead | UnixFileMode.UserWrite;
        }

        using (var stream = new FileStream(temporary, fileOptions))
        {
            JsonSerializer.Serialize(stream, saved, ClusterJsonContext.Default.SavedCredentials);
        }

        File.Move(temporary, CredentialsFile, overwrite: true);
    }

    private void AcceptRootKeys() => protocol.Accept(Current.RootKeys.Select(k => k.Keys));

    private static bool ChangesRootKeys(StateEntry entry) => entry.Changes.Any(c => c is RootKeyRegistered or RootKeysForgotten or Backups.StateRestored);

    private IEnumerable<IStateChange> RootKeyChanges(JoinKeys? keys, DateTimeOffset now) =>
        keys is not null && Current.RootKeys.All(k => k.Keys.RootKeyId != keys.RootKeyId) ? [new RootKeyRegistered(keys, now)] : [];

    private async Task ForgetOldRootKeysAsync(CancellationToken cancellationToken)
    {
        var state = Current;
        if (!IsLeader || !IsWritable || state.RootKeys.Count < 2)
        {
            return;
        }

        var newest = state.RootKeys.MaxBy(k => k.AddedAt)!.Keys.RootKeyId;
        if (state.Replicas.Values.Any(r => r.RootKeyId != newest))
        {
            return;
        }

        var now = time.GetUtcNow();
        var audit = new AuditEntry(Guid.CreateVersion7(now), now, null, "System", null, RotateRootKeyAction, [newest], null, AuditOutcome.Succeeded);
        await AppendLocalAsync(new StateEntry(Guid.CreateVersion7(now), now, [new RootKeysForgotten(newest), new AuditRecorded(audit)]), cancellationToken);
        LogOldRootKeysForgotten(newest);
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "The mounted root key ({RootKeyId}) can't decrypt this replica's state, so it asks the other replicas for the data keys with the certificate it already has")]
    private partial void LogRekeying(string rootKeyId);

    [LoggerMessage(Level = LogLevel.Information, Message = "Got the data keys from {Peer} and protected them with the new root key")]
    private partial void LogRekeyed(IPAddress peer);

    [LoggerMessage(Level = LogLevel.Information, Message = "Every replica uses root key {RootKeyId}, so the cluster forgot the older ones")]
    private partial void LogOldRootKeysForgotten(string rootKeyId);
}
