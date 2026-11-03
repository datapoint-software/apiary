namespace Datapoint.Apiary.Cluster.Acme;

public sealed record AcmeAccount(string DirectoryUrl, string KeyPem, string AccountUrl, DateTimeOffset CreatedAt);
