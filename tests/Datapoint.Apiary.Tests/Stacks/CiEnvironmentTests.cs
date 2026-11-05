using Datapoint.Apiary.Stacks;

namespace Datapoint.Apiary.Tests.Stacks;

public sealed class CiEnvironmentTests
{
    [Fact]
    public void GitLab_reports_its_commit_and_pipeline()
    {
        var ci = Detect(new() { ["GITLAB_CI"] = "true", ["CI_COMMIT_SHA"] = "4f2a9c1", ["CI_PIPELINE_URL"] = "https://gitlab.example.com/shop/-/pipelines/7" });

        Assert.Equal(new CiEnvironment("GitLab", "4f2a9c1", "https://gitlab.example.com/shop/-/pipelines/7"), ci);
    }

    [Fact]
    public void GitHub_Actions_links_to_the_run()
    {
        var ci = Detect(new() { ["GITHUB_ACTIONS"] = "true", ["GITHUB_SHA"] = "4f2a9c1", ["GITHUB_SERVER_URL"] = "https://github.com", ["GITHUB_REPOSITORY"] = "datapoint/shop", ["GITHUB_RUN_ID"] = "123" });

        Assert.Equal(new CiEnvironment("GitHub Actions", "4f2a9c1", "https://github.com/datapoint/shop/actions/runs/123"), ci);
    }

    [Fact]
    public void Jenkins_reports_its_build()
    {
        var ci = Detect(new() { ["JENKINS_URL"] = "https://jenkins.example.com/", ["GIT_COMMIT"] = "4f2a9c1", ["BUILD_URL"] = "https://jenkins.example.com/job/shop/7/" });

        Assert.Equal(new CiEnvironment("Jenkins", "4f2a9c1", "https://jenkins.example.com/job/shop/7/"), ci);
    }

    [Fact]
    public void Azure_Pipelines_links_to_the_build()
    {
        var ci = Detect(new() { ["TF_BUILD"] = "True", ["BUILD_SOURCEVERSION"] = "4f2a9c1", ["SYSTEM_COLLECTIONURI"] = "https://dev.azure.com/datapoint/", ["SYSTEM_TEAMPROJECT"] = "Online Shop", ["BUILD_BUILDID"] = "42" });

        Assert.Equal(new CiEnvironment("Azure Pipelines", "4f2a9c1", "https://dev.azure.com/datapoint/Online%20Shop/_build/results?buildId=42"), ci);
    }

    [Fact]
    public void Apiary_variables_win_over_the_CI_system_and_options_win_over_both()
    {
        var variables = new Dictionary<string, string> { ["GITLAB_CI"] = "true", ["CI_COMMIT_SHA"] = "from-gitlab", ["CI_PIPELINE_URL"] = "https://gitlab.example.com/p/1", ["APIARY_COMMIT"] = "from-variable" };

        var ci = CiEnvironment.Detect(name => variables.GetValueOrDefault(name), pipelineUrl: "https://ci.example.com/run/9");

        Assert.Equal(("from-variable", "https://ci.example.com/run/9"), (ci.Commit, ci.PipelineUrl));
    }

    [Fact]
    public void Outside_a_known_CI_system_nothing_is_found()
    {
        var ci = Detect([]);

        Assert.Equal(new CiEnvironment(null, null, null), ci);
    }

    private static CiEnvironment Detect(Dictionary<string, string> variables) =>
        CiEnvironment.Detect(name => variables.GetValueOrDefault(name));
}
