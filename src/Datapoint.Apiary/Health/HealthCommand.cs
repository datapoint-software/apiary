using System.Globalization;

namespace Datapoint.Apiary.Health;

public static class HealthCommand
{
    public static async Task<int> RunAsync()
    {
        var port = Environment.GetEnvironmentVariable("Apiary__AdminPort") ?? "9443";
        using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
        try
        {
            using var response = await client.GetAsync(new Uri(string.Create(CultureInfo.InvariantCulture, $"http://127.0.0.1:{port}/health/ready")));
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
