using System.Buffers;
using System.Text;
using System.Text.Json;
using Datapoint.Apiary.Cluster.Replicas;
using Datapoint.Apiary.Cluster.State;
using DotNext.IO;
using DotNext.Net.Cluster.Consensus.Raft.StateMachine;

namespace Datapoint.Apiary.Cluster.Raft;

public sealed class ApiaryStateMachine(DirectoryInfo location, StateEncryption encryption, int snapshotEvery)
    : SimpleStateMachine(location)
{
    public const string EntryPurpose = "apiary/state-entry";
    private const string SnapshotPurpose = "apiary/state-snapshot";
    private const int SnapshotVersion = 1;
    private long _sinceSnapshot;

    public Action<StateEntry>? Applied { get; set; }

    public ApiaryState Current { get; private set; } = ApiaryState.Empty;

    public byte[] Seal(StateEntry entry) =>
        Encoding.UTF8.GetBytes(encryption.Seal(EntryPurpose, JsonSerializer.SerializeToUtf8Bytes(entry, ClusterJsonContext.Default.StateEntry)));

    protected override async ValueTask<bool> ApplyAsync(LogEntry entry, CancellationToken token)
    {
        if (entry.IsConfiguration)
        {
            return false;
        }

        var payload = entry.TryGetPayload(out var sequence) ? sequence.ToArray() : await entry.ToByteArrayAsync(token: token);
        if (payload.Length == 0)
        {
            return false;
        }

        var json = encryption.Open(EntryPurpose, Encoding.UTF8.GetString(payload));
        var stateEntry = JsonSerializer.Deserialize(json, ClusterJsonContext.Default.StateEntry)
            ?? throw new InvalidDataException($"An empty state entry at index {entry.Index}.");
        Current = stateEntry.ApplyTo(Current, entry.Index);
        Applied?.Invoke(stateEntry);
        return SnapshotDue(stateEntry);
    }

    protected override ValueTask PersistAsync(IAsyncBinaryWriter writer, CancellationToken token)
    {
        var json = JsonSerializer.SerializeToUtf8Bytes(new StateSnapshot(SnapshotVersion, Current), ClusterJsonContext.Default.StateSnapshot);
        return writer.Invoke(Encoding.UTF8.GetBytes(encryption.Seal(SnapshotPurpose, json)), token);
    }

    protected override async ValueTask RestoreAsync(FileInfo snapshotFile, CancellationToken token)
    {
        var json = encryption.Open(SnapshotPurpose, await File.ReadAllTextAsync(snapshotFile.FullName, token));
        var snapshot = JsonSerializer.Deserialize(json, ClusterJsonContext.Default.StateSnapshot)
            ?? throw new InvalidDataException($"An empty snapshot in {snapshotFile.FullName}.");
        Current = snapshot.State;
        _sinceSnapshot = 0;
    }

    private bool SnapshotDue(StateEntry entry)
    {
        if (++_sinceSnapshot < snapshotEvery && !entry.Changes.Any(c => c is ClusterCreated or ClusterRecovered or ReplicaSaved or ReplicaRemoved or Backups.StateRestored))
        {
            return false;
        }

        _sinceSnapshot = 0;
        return true;
    }
}
