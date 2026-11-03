namespace Datapoint.Apiary.Certificates.Bundles;

public enum CertificateProblem
{
    None,
    PemInvalid,
    KeyInvalid,
    KeyEncrypted,
    KeyMismatch,
    ChainIncomplete,
    Expired,
    NotYetValid,
    NoHostnames,
}
