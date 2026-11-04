using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using Datapoint.Apiary.Cluster.Backups;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Testing;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Cluster.Tests.State;

public sealed class StateSerializationTests
{
    private static readonly IReadOnlyList<Type> s_changeTypes = [.. typeof(IStateChange).Assembly.GetTypes().Where(t => t.IsClass && typeof(IStateChange).IsAssignableFrom(t))];

    [Fact]
    public void Every_change_is_registered_for_serialization()
    {
        var registered = typeof(IStateChange).GetCustomAttributes<JsonDerivedTypeAttribute>().Select(a => a.DerivedType);

        Assert.Empty(s_changeTypes.Except(registered));
    }

    [Fact]
    public void Every_change_has_its_own_name()
    {
        var names = typeof(IStateChange).GetCustomAttributes<JsonDerivedTypeAttribute>().Select(a => a.TypeDiscriminator);

        Assert.Distinct(names);
    }

    [Fact]
    public void The_samples_cover_every_change() =>
        Assert.Empty(s_changeTypes.Except(EveryChange.Samples().Select(c => c.GetType())));

    [Fact]
    public void An_entry_with_every_change_survives_a_round_trip()
    {
        var json = JsonSerializer.Serialize(AnEntry([.. EveryChange.Samples()]), ClusterJsonContext.Default.StateEntry);

        var again = JsonSerializer.Serialize(JsonSerializer.Deserialize(json, ClusterJsonContext.Default.StateEntry), ClusterJsonContext.Default.StateEntry);

        Assert.Equal(json, again);
    }

    [Fact]
    public void A_snapshot_of_every_change_survives_a_round_trip()
    {
        var state = AnEntry([.. EveryChange.Samples().Where(c => c is not StateRestored)]).ApplyTo(ApiaryState.Empty, 1);
        var json = JsonSerializer.Serialize(new StateSnapshot(1, state), ClusterJsonContext.Default.StateSnapshot);

        var again = JsonSerializer.Serialize(JsonSerializer.Deserialize(json, ClusterJsonContext.Default.StateSnapshot), ClusterJsonContext.Default.StateSnapshot);

        Assert.Equal(json, again);
    }

    [Fact]
    public void A_change_is_named_by_its_discriminator()
    {
        var json = JsonSerializer.Serialize(AnEntry(new SetupCompleted()), ClusterJsonContext.Default.StateEntry);

        Assert.Contains("\"$change\":\"setup.completed\"", json, StringComparison.Ordinal);
    }

    [Fact]
    public void Enums_are_stored_as_names()
    {
        var json = JsonSerializer.Serialize(AnEntry(new UserSaved(AUser())), ClusterJsonContext.Default.StateEntry);

        Assert.Contains("\"role\":\"Administrator\"", json, StringComparison.Ordinal);
    }

    [Fact]
    public void An_entry_written_by_an_older_version_still_reads()
    {
        const string json = """{"requestId":"019a4f2e-0000-7000-8000-000000000000","at":"2026-11-04T12:00:00+00:00","changes":[{"$change":"setup.completed"}]}""";

        var entry = JsonSerializer.Deserialize(json, ClusterJsonContext.Default.StateEntry);

        Assert.True(entry?.ApplyTo(ApiaryState.Empty, 1).SetupCompleted);
    }

    [Fact]
    public void A_state_without_the_newer_collections_reads_them_as_empty()
    {
        const string json = """{"version":1,"state":{"index":3}}""";

        var snapshot = JsonSerializer.Deserialize(json, ClusterJsonContext.Default.StateSnapshot);

        Assert.Equal((0, 0, 0, 0), (snapshot?.State.Redirects.Count, snapshot?.State.StreamRoutes.Count, snapshot?.State.Agents.Count, snapshot?.State.RootKeys.Count));
    }

    [Fact]
    public void A_backup_survives_a_round_trip()
    {
        var content = BackupContent.From(AnEntry([.. EveryChange.Samples().Where(c => c is not StateRestored)]).ApplyTo(ApiaryState.Empty, 1), TestClock.Now);
        var json = JsonSerializer.Serialize(content, ClusterJsonContext.Default.BackupContent);

        var again = JsonSerializer.Serialize(JsonSerializer.Deserialize(json, ClusterJsonContext.Default.BackupContent), ClusterJsonContext.Default.BackupContent);

        Assert.Equal(json, again);
    }
}
