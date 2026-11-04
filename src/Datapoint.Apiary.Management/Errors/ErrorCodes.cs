namespace Datapoint.Apiary.Management.Errors;

public static class ErrorCodes
{
    public const string Internal = "internal";
    public const string InvalidRequest = "request.invalid";
    public const string TooManyRequests = "request.tooMany";
    public const string AuthenticationRequired = "auth.required";
    public const string Forbidden = "auth.forbidden";
    public const string NoQuorum = "cluster.noQuorum";
    public const string NotReady = "cluster.notReady";
    public const string Upgrading = "cluster.upgrading";
    public const string RecoveryNotNeeded = "cluster.recoveryNotNeeded";
    public const string NotMostRecent = "cluster.notMostRecent";
    public const string OtherReplica = "cluster.otherReplica";

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
    public const string IpRangeTooMany = "ipRange.tooMany";

    public const string ProjectNotFound = "project.notFound";
    public const string ProjectNameTaken = "project.nameTaken";
    public const string ProjectIconUnknown = "project.iconUnknown";
    public const string ProjectNotEmpty = "project.notEmpty";
    public const string ProjectLast = "project.last";
    public const string ProjectMoveToSelf = "project.moveToSelf";
    public const string RouteNotFound = "route.notFound";
    public const string RouteDuplicate = "route.duplicate";
    public const string RouteTargetsTooMany = "route.targetsTooMany";
    public const string RouteWeightsTotal = "route.weightsTotal";
    public const string RouteCanaryName = "route.canaryName";
    public const string RouteTargetsRequired = "route.targetsRequired";
    public const string RouteRedirectExists = "route.redirectExists";
    public const string RoutePasswordRequired = "route.passwordRequired";
    public const string RoutePasswordShort = "route.passwordShort";
    public const string RouteLinkKeyRequired = "route.linkKeyRequired";
    public const string RouteLinkKeyInvalid = "route.linkKeyInvalid";
    public const string RedirectNotFound = "redirect.notFound";
    public const string RedirectDuplicate = "redirect.duplicate";
    public const string RedirectRouteExists = "redirect.routeExists";
    public const string RedirectWildcard = "redirect.wildcard";
    public const string RedirectTargetInvalid = "redirect.targetInvalid";
    public const string RedirectLoop = "redirect.loop";
    public const string RedirectStatusCode = "redirect.statusCode";
    public const string MaintenanceEndBeforeStart = "maintenance.endBeforeStart";
    public const string MaintenanceTooLong = "maintenance.tooLong";
    public const string MaintenanceEnded = "maintenance.ended";

    public const string CertificateNotFound = "certificate.notFound";
    public const string CertificateNotUploaded = "certificate.notUploaded";
    public const string CertificateNotAutomatic = "certificate.notAutomatic";
    public const string CertificateDoesNotCover = "certificate.doesNotCover";
    public const string CertificateRoutesNotCovered = "certificate.routesNotCovered";
    public const string CertificateInUse = "certificate.inUse";
    public const string CertificatePemInvalid = "certificate.pemInvalid";
    public const string CertificateKeyInvalid = "certificate.keyInvalid";
    public const string CertificateKeyEncrypted = "certificate.keyEncrypted";
    public const string CertificateKeyMismatch = "certificate.keyMismatch";
    public const string CertificateChainIncomplete = "certificate.chainIncomplete";
    public const string CertificateExpired = "certificate.expired";
    public const string CertificateNotYetValid = "certificate.notYetValid";
    public const string CertificateNoHostnames = "certificate.noHostnames";
    public const string CertificateTooLarge = "certificate.tooLarge";
    public const string CertificateRenewing = "certificate.renewing";
    public const string CertificateRenewTooSoon = "certificate.renewTooSoon";

    public const string EmailInvalid = "email.invalid";
    public const string EmailTaken = "email.taken";
    public const string PasswordTooShort = "password.tooShort";
    public const string PasswordTooLong = "password.tooLong";
    public const string PasswordCommon = "password.common";
    public const string PasswordContainsEmail = "password.containsEmail";
    public const string PasswordBreached = "password.breached";
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
    public const string BackupUnreadable = "backup.unreadable";
    public const string ReplicaNotFound = "replica.notFound";
    public const string ReplicaNotPending = "replica.notPending";
    public const string ReplicaReachable = "replica.reachable";
    public const string AgentNotFound = "agent.notFound";
    public const string AgentClientUnknown = "agent.clientUnknown";
    public const string AgentRedirectUnknown = "agent.redirectUnknown";
    public const string AgentRedirectInvalid = "agent.redirectInvalid";
    public const string AgentChallengeInvalid = "agent.challengeInvalid";
    public const string AgentResponseTypeInvalid = "agent.responseTypeInvalid";
    public const string AgentResourceInvalid = "agent.resourceInvalid";
    public const string AgentTooMany = "agent.tooMany";
    public const string AgentOriginInvalid = "agent.originInvalid";
    public const string AgentOriginsTooMany = "agent.originsTooMany";
    public const string SsoIssuerInvalid = "sso.issuerInvalid";
    public const string SsoGroupsRequired = "sso.groupsRequired";
    public const string SsoGroupsTooMany = "sso.groupsTooMany";
    public const string SsoOff = "sso.off";
    public const string SsoFailed = "sso.failed";
    public const string SsoNoRole = "sso.noRole";
    public const string SsoNoEmail = "sso.noEmail";
    public const string SsoEmailTaken = "sso.emailTaken";
    public const string SsoDisabled = "sso.disabled";
    public const string UserManagedBySso = "user.managedBySso";
    public const string StreamNotFound = "stream.notFound";
    public const string StreamPortReserved = "stream.portReserved";
    public const string StreamPortTaken = "stream.portTaken";
    public const string StreamServerNamesUdp = "stream.serverNamesUdp";
    public const string StreamServerNamesTooMany = "stream.serverNamesTooMany";

    public static IReadOnlyList<string> All { get; } =
    [
        Internal, InvalidRequest, TooManyRequests, AuthenticationRequired, Forbidden, NoQuorum, NotReady, Upgrading, RecoveryNotNeeded, NotMostRecent, OtherReplica,
        Required, TooLong, Range, Invalid,
        HostnameRequired, HostnameInvalid, HostnameTooLong, HostnameConsecutiveDots, HostnameLabel, HostnameScheme, HostnamePath,
        HostnameAddress, HostnameNotFull, TargetPort, PathInvalid,
        TargetRequired, TargetInvalid, TargetLoopback, TargetLinkLocal, TargetUnspecified, IpRangeInvalid, IpRangeTooMany,
        ProjectNotFound, ProjectNameTaken, ProjectIconUnknown, ProjectNotEmpty, ProjectLast, ProjectMoveToSelf, RouteNotFound, RouteDuplicate, RouteTargetsRequired, RouteTargetsTooMany, RouteWeightsTotal, RouteCanaryName,
        MaintenanceEndBeforeStart, MaintenanceTooLong, MaintenanceEnded, RouteRedirectExists,
        RoutePasswordRequired, RoutePasswordShort, RouteLinkKeyRequired, RouteLinkKeyInvalid,
        RedirectNotFound, RedirectDuplicate, RedirectRouteExists, RedirectWildcard, RedirectTargetInvalid, RedirectLoop, RedirectStatusCode,
        CertificateNotFound, CertificateNotUploaded, CertificateNotAutomatic, CertificateDoesNotCover, CertificateRoutesNotCovered,
        CertificateInUse, CertificatePemInvalid, CertificateKeyInvalid, CertificateKeyEncrypted, CertificateKeyMismatch,
        CertificateChainIncomplete, CertificateExpired, CertificateNotYetValid, CertificateNoHostnames, CertificateTooLarge, CertificateRenewing, CertificateRenewTooSoon,
        EmailInvalid, EmailTaken, PasswordTooShort, PasswordTooLong, PasswordCommon, PasswordContainsEmail, PasswordBreached, PasswordIncorrect,
        PasswordUnchanged, CodeInvalid, SignInFailed, SignInThrottled, ChallengeExpired, SetupClosed, InviteInvalid,
        UserNotFound, UserLastAdministrator, UserSelf, UserSameRole, UserNotInvited, SessionNotFound, BackupUnreadable,
        ReplicaNotFound, ReplicaNotPending, ReplicaReachable,
        AgentNotFound, AgentClientUnknown, AgentRedirectUnknown, AgentRedirectInvalid, AgentChallengeInvalid, AgentResponseTypeInvalid, AgentResourceInvalid, AgentTooMany, AgentOriginInvalid, AgentOriginsTooMany,
        SsoIssuerInvalid, SsoGroupsRequired, SsoGroupsTooMany, SsoOff, SsoFailed, SsoNoRole, SsoNoEmail, SsoEmailTaken, SsoDisabled,
        UserManagedBySso,
        StreamNotFound, StreamPortReserved, StreamPortTaken, StreamServerNamesUdp, StreamServerNamesTooMany,
    ];
}
