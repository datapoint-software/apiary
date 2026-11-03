namespace Datapoint.Apiary.Certificates.Acme;

public static class AcmeErrors
{
    public const string Unreachable = "acme.unreachable";
    public const string ChallengeFailed = "acme.challengeFailed";
    public const string RateLimited = "acme.rateLimited";
    public const string Rejected = "acme.rejected";
    public const string TimedOut = "acme.timedOut";
}
