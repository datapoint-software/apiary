namespace Datapoint.Apiary.Management.Errors;

public static class ErrorCodes
{
    public const string Internal = "internal";
    public const string InvalidRequest = "request.invalid";
    public const string AuthenticationRequired = "auth.required";
    public const string Forbidden = "auth.forbidden";
    public const string NoQuorum = "cluster.noQuorum";

    public const string Required = "required";
    public const string TooLong = "tooLong";
    public const string Range = "range";
    public const string Invalid = "invalid";

    public const string HostnameInvalid = "hostname.invalid";
    public const string HostnameTooLong = "hostname.tooLong";
    public const string HostnameConsecutiveDots = "hostname.consecutiveDots";
    public const string HostnameLabel = "hostname.label";
    public const string PathInvalid = "path.invalid";
    public const string TargetInvalid = "target.invalid";
    public const string TargetLoopback = "target.loopback";
    public const string TargetLinkLocal = "target.linkLocal";
    public const string TargetUnspecified = "target.unspecified";
    public const string IpRangeInvalid = "ipRange.invalid";

    public const string ProjectNotFound = "project.notFound";
    public const string RouteNotFound = "route.notFound";
    public const string RouteDuplicate = "route.duplicate";
    public const string RouteTargetsRequired = "route.targetsRequired";

    public static IReadOnlyList<string> All { get; } =
    [
        Internal, InvalidRequest, AuthenticationRequired, Forbidden, NoQuorum,
        Required, TooLong, Range, Invalid,
        HostnameInvalid, HostnameTooLong, HostnameConsecutiveDots, HostnameLabel, PathInvalid,
        TargetInvalid, TargetLoopback, TargetLinkLocal, TargetUnspecified, IpRangeInvalid,
        ProjectNotFound, RouteNotFound, RouteDuplicate, RouteTargetsRequired,
    ];
}
