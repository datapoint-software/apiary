namespace Datapoint.Apiary.Certificates.Acme;

public sealed record AcmeDirectory(Uri NewNonce, Uri NewAccount, Uri NewOrder);
