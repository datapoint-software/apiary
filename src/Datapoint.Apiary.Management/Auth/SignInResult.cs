namespace Datapoint.Apiary.Management.Auth;

public sealed record SignInResult(IReadOnlyList<string>? RecoveryCodes);
