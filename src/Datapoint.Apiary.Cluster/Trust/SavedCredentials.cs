namespace Datapoint.Apiary.Cluster.Trust;

public sealed record SavedCredentials(string Key, string CertificatePem, string AuthorityPems);
