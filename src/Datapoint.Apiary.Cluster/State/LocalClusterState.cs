using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;

namespace Datapoint.Apiary.Cluster.State;

public sealed partial class LocalClusterState(
    IOptions<ClusterOptions> options,
    StateEncryption encryption,
    ILogger<LocalClusterState> logger)
    : IClusterState, IDisposable
{
    private const int SnapshotVersion = 1;
    private const string EntryPurpose = "apiary/state-entry";
    private const string SnapshotPurpose = "apiary/state-snapshot";
    private readonly SemaphoreSlim _writeLock = new(1, 1);
    private CancellationTokenSource _changed = new();
    private long _entriesSinceSnapshot;

    public ApiaryState Current { get; private set; } = ApiaryState.Empty;

    public bool IsWritable => true;

    private string Directory => Path.Combine(options.Value.DataDirectory, "state");

    private string LogPath => Path.Combine(Directory, "entries.sealed");

    private string SnapshotPath => Path.Combine(Directory, "snapshot.sealed");

    public IChangeToken GetChangeToken() => new CancellationChangeToken(_changed.Token);

    public async Task LoadAsync(CancellationToken cancellationToken)
    {
        System.IO.Directory.CreateDirectory(Directory);
        await encryption.LoadAsync(Directory, cancellationToken);
        var state = await ReadSnapshotAsync(cancellationToken);
        var replayed = 0;
        foreach (var entry in await ReadLogAsync(cancellationToken))
        {
            state = entry.ApplyTo(state);
            replayed++;
        }

        Current = state;
        _entriesSinceSnapshot = replayed;
        LogLoaded(state.Index, replayed);
        NotifyChanged();
    }

    public async ValueTask AppendAsync(StateEntry entry, CancellationToken cancellationToken)
    {
        await _writeLock.WaitAsync(cancellationToken);
        try
        {
            var next = entry.ApplyTo(Current);
            await WriteEntryAsync(entry, cancellationToken);
            Current = next;
            await SnapshotIfDueAsync(cancellationToken);
        }
        finally
        {
            _writeLock.Release();
        }

        NotifyChanged();
    }

    public void Dispose()
    {
        _writeLock.Dispose();
        _changed.Dispose();
    }

    private async Task<ApiaryState> ReadSnapshotAsync(CancellationToken cancellationToken)
    {
        if (!File.Exists(SnapshotPath))
        {
            return ApiaryState.Empty;
        }

        var json = encryption.Open(SnapshotPurpose, await File.ReadAllTextAsync(SnapshotPath, cancellationToken));
        var snapshot = JsonSerializer.Deserialize(json, ClusterJsonContext.Default.StateSnapshot);
        return snapshot?.State ?? ApiaryState.Empty;
    }

    private async Task<IReadOnlyList<StateEntry>> ReadLogAsync(CancellationToken cancellationToken)
    {
        if (!File.Exists(LogPath))
        {
            return [];
        }

        var entries = new List<StateEntry>();
        foreach (var line in await File.ReadAllLinesAsync(LogPath, cancellationToken))
        {
            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            entries.Add(ParseEntry(line));
        }

        return entries;
    }

    private StateEntry ParseEntry(string line) =>
        JsonSerializer.Deserialize(encryption.Open(EntryPurpose, line), ClusterJsonContext.Default.StateEntry)
        ?? throw new InvalidDataException($"An empty entry in {LogPath}.");

    private async Task WriteEntryAsync(StateEntry entry, CancellationToken cancellationToken)
    {
        var line = encryption.Seal(EntryPurpose, JsonSerializer.SerializeToUtf8Bytes(entry, ClusterJsonContext.Default.StateEntry)) + "\n";
        await using var stream = new FileStream(LogPath, FileMode.Append, FileAccess.Write, FileShare.Read);
        await stream.WriteAsync(System.Text.Encoding.UTF8.GetBytes(line), cancellationToken);
        stream.Flush(flushToDisk: true);
        _entriesSinceSnapshot++;
    }

    private async Task SnapshotIfDueAsync(CancellationToken cancellationToken)
    {
        if (_entriesSinceSnapshot < options.Value.SnapshotEvery)
        {
            return;
        }

        var temporary = SnapshotPath + ".tmp";
        var json = JsonSerializer.SerializeToUtf8Bytes(new StateSnapshot(SnapshotVersion, Current), ClusterJsonContext.Default.StateSnapshot);
        await using (var stream = new FileStream(temporary, FileMode.Create, FileAccess.Write))
        {
            await stream.WriteAsync(System.Text.Encoding.UTF8.GetBytes(encryption.Seal(SnapshotPurpose, json)), cancellationToken);
            stream.Flush(flushToDisk: true);
        }

        File.Move(temporary, SnapshotPath, overwrite: true);
        File.Delete(LogPath);
        _entriesSinceSnapshot = 0;
    }

    private void NotifyChanged()
    {
        var previous = Interlocked.Exchange(ref _changed, new CancellationTokenSource());
        previous.Cancel();
        previous.Dispose();
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Loaded the state at index {Index}, replaying {Replayed} entries")]
    private partial void LogLoaded(long index, int replayed);
}
