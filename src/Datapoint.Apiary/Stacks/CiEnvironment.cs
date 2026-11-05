namespace Datapoint.Apiary.Stacks;

public sealed record CiEnvironment(string? System, string? Commit, string? PipelineUrl)
{
    public static CiEnvironment Detect(Func<string, string?> variables, string? commit = null, string? pipelineUrl = null)
    {
        var detected = Known(variables);
        return detected with
        {
            Commit = Set(commit) ?? Set(variables("APIARY_COMMIT")) ?? detected.Commit,
            PipelineUrl = Set(pipelineUrl) ?? Set(variables("APIARY_PIPELINE_URL")) ?? detected.PipelineUrl,
        };
    }

    private static CiEnvironment Known(Func<string, string?> variables)
    {
        if (variables("GITLAB_CI") == "true")
        {
            return new("GitLab", Set(variables("CI_COMMIT_SHA")), Set(variables("CI_PIPELINE_URL")));
        }

        if (variables("GITHUB_ACTIONS") == "true")
        {
            return new("GitHub Actions", Set(variables("GITHUB_SHA")), GitHubRun(variables));
        }

        if (Set(variables("JENKINS_URL")) is not null)
        {
            return new("Jenkins", Set(variables("GIT_COMMIT")), Set(variables("BUILD_URL")));
        }

        if (string.Equals(variables("TF_BUILD"), "True", StringComparison.OrdinalIgnoreCase))
        {
            return new("Azure Pipelines", Set(variables("BUILD_SOURCEVERSION")), AzureBuild(variables));
        }

        return new(null, null, null);
    }

    private static string? GitHubRun(Func<string, string?> variables) =>
        (Set(variables("GITHUB_SERVER_URL")), Set(variables("GITHUB_REPOSITORY")), Set(variables("GITHUB_RUN_ID"))) is (string server, string repository, string run)
            ? $"{server.TrimEnd('/')}/{repository}/actions/runs/{run}"
            : null;

    private static string? AzureBuild(Func<string, string?> variables) =>
        (Set(variables("SYSTEM_COLLECTIONURI")), Set(variables("SYSTEM_TEAMPROJECT")), Set(variables("BUILD_BUILDID"))) is (string collection, string project, string build)
            ? $"{collection.TrimEnd('/')}/{Uri.EscapeDataString(project)}/_build/results?buildId={build}"
            : null;

    private static string? Set(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
