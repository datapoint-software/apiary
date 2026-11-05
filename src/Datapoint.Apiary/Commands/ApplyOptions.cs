namespace Datapoint.Apiary.Commands;

public sealed record ApplyOptions(string Path, string Stack, string Server, string Token)
{
    public bool DryRun { get; init; }

    public bool AllowRemovingAll { get; init; }

    public string? Commit { get; init; }

    public string? PipelineUrl { get; init; }

    public string? CertificateSha256 { get; init; }

    public static ApplyOptions? Parse(IReadOnlyList<string> args, Func<string, string?> variables)
    {
        var path = args.Count > 0 && !args[0].StartsWith("--", StringComparison.Ordinal) ? args[0] : null;
        var stack = OperatorClient.Option(args, "--stack");
        var server = OperatorClient.Option(args, "--server") ?? variables("APIARY_SERVER");
        var token = variables("APIARY_TOKEN")?.Trim();
        if (path is null || stack is null || server is null || string.IsNullOrEmpty(token))
        {
            return null;
        }

        return new ApplyOptions(path, stack, server, token)
        {
            DryRun = args.Contains("--dry-run", StringComparer.Ordinal),
            AllowRemovingAll = args.Contains("--allow-removing-all", StringComparer.Ordinal),
            Commit = OperatorClient.Option(args, "--commit"),
            PipelineUrl = OperatorClient.Option(args, "--pipeline-url"),
            CertificateSha256 = OperatorClient.Option(args, "--certificate-sha256") ?? variables("APIARY_CERTIFICATE_SHA256"),
        };
    }
}
