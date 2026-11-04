using Datapoint.Apiary.Cluster.Backups;
using Datapoint.Apiary.Cluster.Projects;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Security.Keys;
using Datapoint.Apiary.Testing;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Cluster.Tests.Backups;

public sealed class BackupSealerTests
{
    private readonly RootKey _rootKey = RootKey.Generate();

    [Fact]
    public void A_sealed_backup_opens_with_the_same_root_key()
    {
        var project = AProject();
        var sealer = new BackupSealer(_rootKey);

        var opened = sealer.Open(sealer.Seal(BackupContent.From(ApiaryState.Empty.With(new ProjectSaved(project)), TestClock.Now)));

        Assert.Equal(project, opened?.State.Projects[project.Id]);
    }

    [Fact]
    public void A_sealed_backup_starts_with_its_format() =>
        Assert.StartsWith("apiary-backup-1:", new BackupSealer(_rootKey).Seal(BackupContent.From(ApiaryState.Empty, TestClock.Now)), StringComparison.Ordinal);

    [Fact]
    public void A_sealed_backup_opens_despite_surrounding_whitespace()
    {
        var sealer = new BackupSealer(_rootKey);

        var opened = sealer.Open($"\n  {sealer.Seal(BackupContent.From(ApiaryState.Empty, TestClock.Now))}  \n");

        Assert.NotNull(opened);
    }

    [Fact]
    public void A_backup_doesn_t_open_with_another_root_key()
    {
        var sealedText = new BackupSealer(_rootKey).Seal(BackupContent.From(ApiaryState.Empty, TestClock.Now));

        Assert.Null(new BackupSealer(RootKey.Generate()).Open(sealedText));
    }

    [Fact]
    public void A_truncated_backup_doesn_t_open()
    {
        var sealer = new BackupSealer(_rootKey);
        var sealedText = sealer.Seal(BackupContent.From(ApiaryState.Empty, TestClock.Now));

        Assert.Null(sealer.Open(sealedText[..^1]));
    }

    [Theory]
    [InlineData("")]
    [InlineData("apiary-backup-1:")]
    [InlineData("apiary-backup-2:abc")]
    [InlineData("{\"version\":1}")]
    public void Text_that_isn_t_a_backup_doesn_t_open(string text) =>
        Assert.Null(new BackupSealer(_rootKey).Open(text));

    [Fact]
    public void A_backup_of_another_version_doesn_t_open()
    {
        var sealer = new BackupSealer(_rootKey);

        var sealedText = sealer.Seal(BackupContent.From(ApiaryState.Empty, TestClock.Now) with { Version = BackupContent.CurrentVersion + 1 });

        Assert.Null(sealer.Open(sealedText));
    }
}
