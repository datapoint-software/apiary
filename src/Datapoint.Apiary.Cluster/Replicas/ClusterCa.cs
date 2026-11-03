namespace Datapoint.Apiary.Cluster.Replicas;

public sealed record ClusterCa(string CertificatePem, string KeyPem, DateTimeOffset NotAfter);
