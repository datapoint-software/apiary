using Datapoint.Apiary.Cluster.Join;

namespace Datapoint.Apiary.Cluster.Keys;

public sealed record RegisteredRootKey(JoinKeys Keys, DateTimeOffset AddedAt);
