using System.Text.Json;
using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Raft;

public sealed record ReplicaIdentity(Guid Id, DateTimeOffset CreatedAt)
{
    private const string FileName = "replica.json";

    public static async Task<ReplicaIdentity> LoadOrCreateAsync(string directory, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var path = Path.Combine(directory, FileName);
        if (File.Exists(path))
        {
            await using var stream = File.OpenRead(path);
            return await JsonSerializer.DeserializeAsync(stream, ClusterJsonContext.Default.ReplicaIdentity, cancellationToken)
                ?? throw new InvalidDataException($"An empty replica identity in {path}.");
        }

        var identity = new ReplicaIdentity(Guid.CreateVersion7(now), now);
        await File.WriteAllBytesAsync(path, JsonSerializer.SerializeToUtf8Bytes(identity, ClusterJsonContext.Default.ReplicaIdentity), cancellationToken);
        return identity;
    }
}
