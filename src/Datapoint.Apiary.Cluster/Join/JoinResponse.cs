namespace Datapoint.Apiary.Cluster.Join;

public sealed record JoinResponse(
    JoinStatus Status,
    Guid ReplicaId,
    string Address,
    Guid? ClusterId,
    string? AuthorityPem,
    string? CertificatePem,
    string? Keys,
    string Mac = "");
