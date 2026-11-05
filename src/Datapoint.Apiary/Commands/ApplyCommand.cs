using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json;
using Datapoint.Apiary.Api;
using Datapoint.Apiary.Cluster.Stacks;
using Datapoint.Apiary.Management.Stacks;
using Datapoint.Apiary.Stacks;

namespace Datapoint.Apiary.Commands;

public static class ApplyCommand
{
    private const string Usage = "Usage: apiary apply <stack file> --stack <name> --server <admin url> [--dry-run] [--allow-removing-all] [--commit <commit>] [--pipeline-url <url>] [--certificate-sha256 <fingerprint>], with the pipeline token in APIARY_TOKEN";
    private static readonly JsonSerializerOptions s_responses = new(JsonSerializerDefaults.Web) { Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter(JsonNamingPolicy.CamelCase) } };

    public static async Task<int> RunAsync(IReadOnlyList<string> args, Func<string, string?>? variables = null, HttpMessageHandler? handler = null)
    {
        variables ??= Environment.GetEnvironmentVariable;
        if (ApplyOptions.Parse(args, variables) is not { } options)
        {
            await Console.Error.WriteLineAsync(Usage);
            return 2;
        }

        if (await ReadAsync(options.Path, variables) is not { } file)
        {
            return 2;
        }

        var ci = CiEnvironment.Detect(variables, options.Commit, options.PipelineUrl);
        if (ci.Commit is null && ci.PipelineUrl is null)
        {
            await Console.Error.WriteLineAsync("Warning: found no commit or pipeline link, so Apiary shows this apply without them. Set --commit and --pipeline-url, or APIARY_COMMIT and APIARY_PIPELINE_URL, or pass your CI system's variables to the container.");
        }

        var request = new ApplyStackFile(options.Stack, file.Routes, file.StreamRoutes, file.Redirects, ci.Commit, ci.PipelineUrl, options.DryRun, options.AllowRemovingAll);
        using var client = Client(options, handler);
        Console.WriteLine($"{(request.DryRun ? "Planning" : "Applying")} stack {request.Stack}: {file.Routes.Count} routes, {file.StreamRoutes.Count} stream routes and {file.Redirects.Count} redirects from {file.Labels} labels on {file.Services} services.");
        return await SendAsync(client, request);
    }

    private static async Task<StackFile?> ReadAsync(string path, Func<string, string?> variables)
    {
        if (!File.Exists(path))
        {
            await Console.Error.WriteLineAsync($"There's no stack file at {path}.");
            return null;
        }

        using var text = File.OpenText(path);
        var file = StackFileReader.Read(text, variables);
        foreach (var error in file.Errors)
        {
            await Console.Error.WriteLineAsync(error);
        }

        return file.Errors.Count > 0 ? null : file;
    }

    private static async Task<int> SendAsync(HttpClient client, ApplyStackFile request)
    {
        HttpResponseMessage response;
        try
        {
            response = await client.PostAsJsonAsync("api/stacks/apply", request, ApiJson.Options);
        }
        catch (HttpRequestException exception)
        {
            await Console.Error.WriteLineAsync($"Couldn't reach Apiary at {client.BaseAddress}: {exception.Message}");
            return 1;
        }

        using (response)
        {
            if (!response.IsSuccessStatusCode)
            {
                await Console.Error.WriteLineAsync(Refusal(await response.Content.ReadAsStringAsync()));
                return 1;
            }

            var plan = await response.Content.ReadFromJsonAsync<StackPlan>(s_responses);
            Print(plan ?? StackPlan.Empty, request.DryRun);
            return 0;
        }
    }

    private static HttpClient Client(ApplyOptions options, HttpMessageHandler? handler)
    {
        var pinned = options.CertificateSha256?.Replace(":", "", StringComparison.Ordinal).Trim();
        handler ??= new SocketsHttpHandler
        {
            SslOptions = pinned is null ? new() : new() { RemoteCertificateValidationCallback = (_, certificate, _, _) => Matches(certificate, pinned) },
        };
        var client = new HttpClient(handler) { BaseAddress = new Uri(options.Server.TrimEnd('/') + "/"), Timeout = TimeSpan.FromSeconds(100) };
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", options.Token);
        return client;
    }

    private static bool Matches(X509Certificate? certificate, string fingerprint) =>
        certificate is not null && string.Equals(certificate.GetCertHashString(HashAlgorithmName.SHA256), fingerprint, StringComparison.OrdinalIgnoreCase);

    private static string Refusal(string body)
    {
        try
        {
            var problem = JsonSerializer.Deserialize<ApiProblem>(body, s_responses);
            if (problem is null)
            {
                return $"Apiary refused it: {body}";
            }

            var details = problem.Params is { Count: > 0 } values ? " (" + string.Join(", ", values.Select(p => $"{p.Key} {p.Value}")) + ")" : "";
            var fields = (problem.Errors ?? []).Select(e => $"{Environment.NewLine}  {e.Field}: {e.Code}");
            return $"Apiary refused it: {problem.Code}{details}{string.Concat(fields)}";
        }
        catch (JsonException)
        {
            return $"Apiary refused it: {body}";
        }
    }

    private static void Print(StackPlan plan, bool dryRun)
    {
        foreach (var item in plan.Added)
        {
            Console.WriteLine($"+ {Kind(item.Kind)} {item.Name}");
        }

        foreach (var item in plan.Changed)
        {
            Console.WriteLine($"~ {Kind(item.Kind)} {item.Name}: {item.Field} {item.From ?? "(none)"} -> {item.To ?? "(none)"}");
            if (item.ReplacedBy is not null)
            {
                Console.WriteLine($"  replaces a change {item.ReplacedBy} made in Apiary at {item.ReplacedAt:yyyy-MM-dd HH:mm} UTC");
            }
        }

        foreach (var item in plan.Removed)
        {
            Console.WriteLine($"- {Kind(item.Kind)} {item.Name}");
        }

        var summary = $"{plan.Added.Count} to add, {plan.Changed.Count} to change, {plan.Removed.Count} to remove";
        Console.WriteLine(plan.Count == 0 ? "Nothing to change." : dryRun ? $"Plan: {summary}. Nothing was applied." : $"Applied: {summary}.");
    }

    private static string Kind(StackItemKind kind) => kind switch
    {
        StackItemKind.StreamRoute => "stream route",
        StackItemKind.Redirect => "redirect",
        _ => "route",
    };
}
