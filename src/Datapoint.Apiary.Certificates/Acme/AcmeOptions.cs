namespace Datapoint.Apiary.Certificates.Acme;

public sealed class AcmeOptions
{
    public const string LetsEncryptStaging = "https://acme-staging-v02.api.letsencrypt.org/directory";

    public const string LetsEncrypt = "https://acme-v02.api.letsencrypt.org/directory";

    public string DirectoryUrl { get; set; } = LetsEncryptStaging;

    public string? Email { get; set; }
}
