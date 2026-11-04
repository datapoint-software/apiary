namespace Datapoint.Apiary.Testing;

public static class Eventually
{
    private static readonly TimeSpan s_timeout = TimeSpan.FromSeconds(10);
    private static readonly TimeSpan s_interval = TimeSpan.FromMilliseconds(10);

    public static async Task<bool> TrueAsync(Func<bool> condition)
    {
        using var timeout = new CancellationTokenSource(s_timeout);
        while (!condition())
        {
            if (timeout.IsCancellationRequested)
            {
                return false;
            }

            await Task.Delay(s_interval, CancellationToken.None);
        }

        return true;
    }
}
