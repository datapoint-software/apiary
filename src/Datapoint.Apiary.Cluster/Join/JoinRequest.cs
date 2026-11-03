namespace Datapoint.Apiary.Cluster.Join;

public sealed record JoinRequest(
    Guid ReplicaId,
    string Node,
    string Address,
    Guid? ClusterId,
    string PublicKey,
    DateTimeOffset At,
    string Nonce,
    string Mac = "");
