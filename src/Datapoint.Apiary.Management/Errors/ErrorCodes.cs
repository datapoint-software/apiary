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

    public const string HostnameRequired = "hostname.required";
    public const string HostnameInvalid = "hostname.invalid";
    public const string HostnameTooLong = "hostname.tooLong";
    public const string HostnameConsecutiveDots = "hostname.consecutiveDots";
    public const string HostnameLabel = "hostname.label";
    public const string HostnameScheme = "hostname.scheme";
    public const string HostnamePath = "hostname.path";
    public const string HostnameAddress = "hostname.address";
    public const string HostnameNotFull = "hostname.notFull";
    public const string TargetPort = "target.port";
    public const string PathInvalid = "path.invalid";
    public const string TargetRequired = "target.required";
    public const string TargetInvalid = "target.invalid";
    public const string TargetLoopback = "target.loopback";
    public const string TargetLinkLocal = "target.linkLocal";
    public const string TargetUnspecified = "target.unspecified";
    public const string IpRangeInvalid = "ipRange.invalid";

    public const string ProjectNotFound = "project.notFound";
    public const string RouteNotFound = "route.notFound";
    public const string RouteDuplicate = "route.duplicate";
    public const string RouteTargetsRequired = "route.targetsRequired";

    public const string EmailInvalid = "email.invalid";
    public const string EmailTaken = "email.taken";
    public const string PasswordTooShort = "password.tooShort";
    public const string PasswordTooLong = "password.tooLong";
    public const string PasswordCommon = "password.common";
    public const string PasswordContainsEmail = "password.containsEmail";
    public const string PasswordIncorrect = "password.incorrect";
    public const string PasswordUnchanged = "password.unchanged";
    public const string CodeInvalid = "code.invalid";
    public const string SignInFailed = "auth.signInFailed";
    public const string SignInThrottled = "auth.throttled";
    public const string ChallengeExpired = "auth.challengeExpired";
    public const string SetupClosed = "setup.closed";
    public const string InviteInvalid = "invite.invalid";
    public const string UserNotFound = "user.notFound";
    public const string UserLastAdministrator = "user.lastAdministrator";
    public const string UserSelf = "user.self";
    public const string UserSameRole = "user.sameRole";
    public const string UserNotInvited = "user.notInvited";
    public const string SessionNotFound = "session.notFound";

    public static IReadOnlyList<string> All { get; } =
    [
        Internal, InvalidRequest, AuthenticationRequired, Forbidden, NoQuorum,
        Required, TooLong, Range, Invalid,
        HostnameRequired, HostnameInvalid, HostnameTooLong, HostnameConsecutiveDots, HostnameLabel, HostnameScheme, HostnamePath,
        HostnameAddress, HostnameNotFull, TargetPort, PathInvalid,
        TargetRequired, TargetInvalid, TargetLoopback, TargetLinkLocal, TargetUnspecified, IpRangeInvalid,
        ProjectNotFound, RouteNotFound, RouteDuplicate, RouteTargetsRequired,
        EmailInvalid, EmailTaken, PasswordTooShort, PasswordTooLong, PasswordCommon, PasswordContainsEmail, PasswordIncorrect,
        PasswordUnchanged, CodeInvalid, SignInFailed, SignInThrottled, ChallengeExpired, SetupClosed, InviteInvalid,
        UserNotFound, UserLastAdministrator, UserSelf, UserSameRole, UserNotInvited, SessionNotFound,
    ];
}
