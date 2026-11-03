using System.Text.Json;
using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Raft;

public sealed record AddressHistory(IReadOnlyList<KnownAddress> Addresses)
{
    private const int Limit = 200;

    public static AddressHistory Load(string path) =>
        File.Exists(path)
            ? JsonSerializer.Deserialize(File.ReadAllBytes(path), ClusterJsonContext.Default.AddressHistory) ?? new([])
            : new([]);

    public void Save(string path) =>
        File.WriteAllBytes(path, JsonSerializer.SerializeToUtf8Bytes(this, ClusterJsonContext.Default.AddressHistory));

    public AddressHistory With(IEnumerable<KnownAddress> seen)
    {
        var all = Addresses.Concat(seen)
            .GroupBy(a => a.Address, StringComparer.Ordinal)
            .Select(g => g.MaxBy(a => a.SeenAt)!)
            .OrderByDescending(a => a.SeenAt)
            .Take(Limit);
        return new([.. all]);
    }

    public Guid? ReplicaAt(string address) => Addresses.FirstOrDefault(a => a.Address == address)?.ReplicaId;
}
