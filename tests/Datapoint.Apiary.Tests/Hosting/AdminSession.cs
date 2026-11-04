using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Security.Passwords;
using Datapoint.Apiary.Security.TwoStep;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Tests.Hosting;

internal static class AdminSession
{
    public const string Password = "correct horse battery staple";
    private const string Secret = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";

    public static async Task<User> UserAsync(ApiaryApp app, Role role = Role.Administrator, string email = "ana@example.com")
    {
        var user = AUser(email, role) with
        {
            PasswordHash = PasswordHasher.Hash(Password),
            TwoStep = new TwoStepSetup(Secret, DateTimeOffset.UtcNow.AddDays(-1), 0, []),
        };
        await app.SeedAsync(new UserSaved(user));
        return user;
    }

    public static async Task<HttpClient> SignedInAsync(ApiaryApp app, Role role = Role.Administrator, string email = "ana@example.com", string? code = null)
    {
        await UserAsync(app, role, email);
        var client = Clients.Admin(app);
        var step = await PostAsync(client, "auth/sign-in", new JsonObject { ["email"] = email, ["password"] = Password });
        await PostAsync(client, "auth/verify", new JsonObject { ["challenge"] = step["challenge"]!.GetValue<string>(), ["code"] = code ?? CurrentCode() });
        return client;
    }

    public static string CurrentCode() => Totp.Compute(Base32.Decode(Secret), Totp.Step(DateTimeOffset.UtcNow));

    public static async Task<string> WaitForNextCodeAsync()
    {
        var now = DateTimeOffset.UtcNow;
        var next = Totp.Step(now) + 1;
        await Task.Delay(DateTimeOffset.FromUnixTimeSeconds(next * 30) - now, TestContext.Current.CancellationToken);
        return Totp.Compute(Base32.Decode(Secret), next);
    }

    public static string PreviousCode() => Totp.Compute(Base32.Decode(Secret), Totp.Step(DateTimeOffset.UtcNow) - 1);

    public static string NextCode() => Totp.Compute(Base32.Decode(Secret), Totp.Step(DateTimeOffset.UtcNow) + 1);

    public static async Task<JsonNode> PostAsync(HttpClient client, string action, JsonObject? body = null)
    {
        using var response = await client.PostAsJsonAsync(new Uri("/api/" + action, UriKind.Relative), body ?? [], TestContext.Current.CancellationToken);
        var text = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        Assert.True(response.IsSuccessStatusCode, $"{action} answered {(int)response.StatusCode}: {text}");
        return JsonNode.Parse(text.Length == 0 ? "null" : text) ?? new JsonObject();
    }
}
