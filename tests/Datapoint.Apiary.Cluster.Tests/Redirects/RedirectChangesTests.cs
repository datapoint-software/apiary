using System.Text.Json;
using System.Text.Json.Nodes;
using Datapoint.Apiary.Cluster.Redirects;
using Datapoint.Apiary.Cluster.State;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Cluster.Tests.Redirects;

public sealed class RedirectChangesTests
{
    [Fact]
    public void A_redirect_takes_the_whole_hostname_by_default() =>
        Assert.Equal("/", ARedirect().Path);

    [Fact]
    public void A_redirect_saved_before_paths_existed_takes_the_whole_hostname()
    {
        var json = JsonNode.Parse(JsonSerializer.Serialize(AnEntry(new RedirectSaved(ARedirect())), ClusterJsonContext.Default.StateEntry))!;
        json["changes"]![0]!["redirect"]!.AsObject().Remove("path");

        var entry = json.Deserialize(ClusterJsonContext.Default.StateEntry)!;

        Assert.Equal("/", Assert.IsType<RedirectSaved>(Assert.Single(entry.Changes)).Redirect.Path);
    }

    [Fact]
    public void Saving_a_redirect_of_the_whole_hostname_works_on_every_schema() =>
        Assert.Equal(1, StateSchema.Required(AnEntry(RedirectChanges.Saved(ARedirect()))));

    [Fact]
    public void Saving_a_redirect_at_a_path_needs_every_replica_on_the_fourth_schema() =>
        Assert.Equal(4, StateSchema.Required(AnEntry(RedirectChanges.Saved(ARedirect() with { Path = "/docs" }))));

    [Fact]
    public void Saving_a_redirect_at_a_path_keeps_the_path()
    {
        var redirect = ARedirect() with { Path = "/docs" };

        var state = ApiaryState.Empty.With(RedirectChanges.Saved(redirect));

        Assert.Equal("/docs", state.Redirects[redirect.Id].Path);
    }
}
