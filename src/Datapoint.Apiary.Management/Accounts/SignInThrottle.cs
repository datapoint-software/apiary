using System.Collections.Concurrent;
using Datapoint.Apiary.Management.Errors;

namespace Datapoint.Apiary.Management.Accounts;

public sealed class SignInThrottle(TimeProvider time)
{
    public const int AuditedFailures = 5;

    private const int FreeFailures = 3;
    private const int MaximumEntries = 10_000;
    private static readonly TimeSpan s_maximumDelay = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan s_forgetAfter = TimeSpan.FromHours(1);

    private readonly ConcurrentDictionary<string, SignInAttempts> _attempts = new(StringComparer.Ordinal);

    public void EnsureAllowed(string key)
    {
        var now = time.GetUtcNow();
        if (!_attempts.TryGetValue(key, out var attempts) || attempts.NextAllowedAt <= now)
        {
            return;
        }

        var seconds = (int)Math.Ceiling((attempts.NextAllowedAt - now).TotalSeconds);
        throw new ActionFailedException(ErrorCodes.SignInThrottled, FailureKind.Throttled)
        {
            Params = new Dictionary<string, object?>(StringComparer.Ordinal) { ["retryAfter"] = seconds },
        };
    }

    public int Failed(string key)
    {
        var now = time.GetUtcNow();
        if (_attempts.Count >= MaximumEntries)
        {
            Forget(now);
        }

        var attempts = _attempts.AddOrUpdate(
            key,
            _ => new SignInAttempts(1, now, now),
            (_, previous) => new SignInAttempts(previous.Failures + 1, now + Delay(previous.Failures + 1), now));
        return attempts.Failures;
    }

    public void Succeeded(string key) => _attempts.TryRemove(key, out _);

    private static TimeSpan Delay(int failures) =>
        failures <= FreeFailures
            ? TimeSpan.Zero
            : TimeSpan.FromSeconds(Math.Min(Math.Pow(2, failures - FreeFailures), s_maximumDelay.TotalSeconds));

    private void Forget(DateTimeOffset now)
    {
        foreach (var (key, attempts) in _attempts)
        {
            if (now - attempts.LastFailureAt > s_forgetAfter)
            {
                _attempts.TryRemove(key, out _);
            }
        }
    }
}
