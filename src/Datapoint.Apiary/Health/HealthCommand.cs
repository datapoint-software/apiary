using System.Globalization;
using Datapoint.Apiary.Hosting;

namespace Datapoint.Apiary.Health;

public static class HealthCommand
{
    public static async Task<int> RunAsync()
    {
        var port = int.Parse(Environment.GetEnvironmentVariable("Apiary__AdminPort") ?? "9443", CultureInfo.InvariantCulture);
        using var client = LoopbackHttp.Create(port, TimeSpan.FromSeconds(5));
        try
        {
            using var response = await client.GetAsync(new Uri("health/ready", UriKind.Relative));
            return response.IsSuccessStatusCode ? 0 : 1;
        }
        catch (HttpRequestException)
        {
            return 1;
        }
        catch (TaskCanceledException)
        {
            return 1;
        }
    }
}
