using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Security.Tokens;
using Datapoint.Apiary.Security.TwoStep;

namespace Datapoint.Apiary.Management.Accounts;

public static class TwoStepCodes
{
    public static TwoStepSetup? Use(TwoStepSetup setup, string code, DateTimeOffset now)
    {
        if (Totp.Verify(setup.Secret, code, now, setup.LastUsedStep) is { } step)
        {
            return setup with { LastUsedStep = step };
        }

        var hash = RecoveryCodes.Hash(code);
        return setup.RecoveryCodeHashes.Contains(hash, StringComparer.Ordinal)
            ? setup with { RecoveryCodeHashes = [.. setup.RecoveryCodeHashes.Where(h => h != hash)] }
            : null;
    }

    public static TwoStepSetup? Enroll(string secret, string code, DateTimeOffset now, IReadOnlyList<string> recoveryCodes) =>
        Totp.Verify(secret, code, now, lastUsedStep: 0) is { } step
            ? new TwoStepSetup(secret, now, step, [.. recoveryCodes.Select(RecoveryCodes.Hash)])
            : null;
}
