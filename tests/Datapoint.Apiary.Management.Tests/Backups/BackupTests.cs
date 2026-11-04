using Datapoint.Apiary.Cluster.Backups;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Backups;
using Datapoint.Apiary.Management.Projects;
using Datapoint.Apiary.Security.Keys;
using Datapoint.Apiary.Testing;
using Datapoint.Mediator.Authorization;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Management.Tests.Backups;

public sealed class BackupTests : IDisposable
{
    private readonly ManagementHost _host = new();

    public BackupTests() => _host.SignedIn();

    public void Dispose() => _host.Dispose();

    [Fact]
    public async Task A_backup_is_named_after_when_it_was_taken()
    {
        var file = await _host.SendAsync(new ExportBackup());

        Assert.Equal("apiary-2026-11-04-1200.backup", file.Name);
    }

    [Fact]
    public async Task Restoring_a_backup_brings_back_what_was_deleted_since()
    {
        var project = _host.AProjectIn();
        var route = ARoute(project.Id);
        _host.Seed(new RouteSaved(route));
        var file = await _host.SendAsync(new ExportBackup());
        _host.Seed(new RouteDeleted(route.Id));

        var restored = await _host.SendAsync(new RestoreBackup(file.Content));

        Assert.Equal((1, 1), (restored.Routes, restored.Users));
        Assert.True(_host.State.Routes.ContainsKey(route.Id));
    }

    [Fact]
    public async Task Restoring_a_backup_signs_the_administrator_out()
    {
        var file = await _host.SendAsync(new ExportBackup());

        await _host.SendAsync(new RestoreBackup(file.Content));

        Assert.True(_host.Cookie.Cleared);
    }

    [Fact]
    public async Task A_backup_from_a_cluster_with_another_root_key_can_t_be_restored()
    {
        var other = new BackupSealer(RootKey.Generate()).Seal(BackupContent.From(_host.State, TestClock.Now));

        Assert.Contains("Content: backup.unreadable", await _host.ErrorsAsync(new RestoreBackup(other)));
    }

    [Fact]
    public async Task A_backup_larger_than_25_MiB_isn_t_read()
    {
        Assert.Contains("Content: backup.unreadable", await _host.ErrorsAsync(new RestoreBackup(new string('a', BackupRestorer.MaxLength + 1))));
    }

    [Fact]
    public async Task The_status_counts_the_changes_since_the_last_backup()
    {
        await _host.SendAsync(new CreateProject("Shop"));
        await _host.SendAsync(new ExportBackup());
        _host.Time.Advance(TimeSpan.FromMinutes(1));
        await _host.SendAsync(new CreateProject("Blog"));

        var status = await _host.QueryAsync(new GetBackupStatus());

        Assert.Equal((TestClock.Now, "ana@example.com", 1L), (status.LastAt, status.LastBy, status.ChangesSince));
    }

    [Fact]
    public async Task Without_a_backup_every_change_counts()
    {
        await _host.SendAsync(new CreateProject("Shop"));

        var status = await _host.QueryAsync(new GetBackupStatus());

        Assert.Equal(((DateTimeOffset?)null, 1L), (status.LastAt, status.ChangesSince));
    }

    [Fact]
    public async Task Only_an_administrator_exports_a_backup()
    {
        _host.SignedIn(Role.Operator, "bea@example.com");

        await Assert.ThrowsAsync<AccessDeniedException>(() => _host.SendAsync(new ExportBackup()));
    }
}
