namespace Datapoint.Apiary.Certificates.Dns;

public enum DnsResponseCode
{
    NoError = 0,
    FormatError = 1,
    ServerFailure = 2,
    NameError = 3,
    NotImplemented = 4,
    Refused = 5,
    NotAuthorized = 9,
    NotZone = 10,
}
