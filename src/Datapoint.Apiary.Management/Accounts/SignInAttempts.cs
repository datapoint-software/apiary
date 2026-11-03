namespace Datapoint.Apiary.Management.Accounts;

public sealed record SignInAttempts(int Failures, DateTimeOffset NextAllowedAt, DateTimeOffset LastFailureAt);
