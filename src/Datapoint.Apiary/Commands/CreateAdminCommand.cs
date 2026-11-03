using System.Text.Json;

namespace Datapoint.Apiary.Commands;

public static class CreateAdminCommand
{
    public static async Task<int> RunAsync(IReadOnlyList<string> args)
    {
        var name = OperatorClient.Option(args, "--name");
        var email = OperatorClient.Option(args, "--email");
        if (name is null || email is null)
        {
            await Console.Error.WriteLineAsync("Usage: apiary users create-admin --name <name> --email <email> [--url <admin url>]");
            return 2;
        }

        using var client = await OperatorClient.CreateAsync();
        using var response = await client.PostAsJsonAsync("api/users/create-admin", new { name, email });
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        if (!response.IsSuccessStatusCode)
        {
            await Console.Error.WriteLineAsync($"Apiary refused it: {body}");
            return 1;
        }

        var url = (OperatorClient.Option(args, "--url") ?? $"https://localhost:{OperatorClient.AdminPort()}").TrimEnd('/');
        Console.WriteLine($"Open this link within 15 minutes to set the password and two-step sign-in for {email}:");
        Console.WriteLine($"{url}/invite/{body.GetProperty("token").GetString()}");
        return 0;
    }
}
