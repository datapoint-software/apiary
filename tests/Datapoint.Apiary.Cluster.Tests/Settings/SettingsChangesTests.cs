using Datapoint.Apiary.Cluster.Backups;
using Datapoint.Apiary.Cluster.Brands;
using Datapoint.Apiary.Cluster.Projects;
using Datapoint.Apiary.Cluster.SingleSignOn;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Testing;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Cluster.Tests.Settings;

public sealed class SettingsChangesTests
{
    [Fact]
    public void Saving_single_sign_on_settings_replaces_them()
    {
        var settings = SomeSsoSettings();

        var state = ApiaryState.Empty.With(new SsoSettingsSaved(settings));

        Assert.Same(settings, state.SingleSignOn);
    }

    [Fact]
    public void Exporting_a_backup_remembers_it()
    {
        var backup = new LastBackup(TestClock.Now, "ana@example.com", 42);

        var state = ApiaryState.Empty.With(new BackupExported(backup));

        Assert.Equal(backup, state.LastBackup);
    }

    [Fact]
    public void Saving_the_brand_without_a_project_sets_the_cluster_s_brand()
    {
        var brand = ABrand();

        var state = ApiaryState.Empty.With(new BrandSaved(null, brand));

        Assert.Same(brand, state.Brand);
    }

    [Fact]
    public void Saving_a_project_s_brand_sets_only_that_project_s_brand()
    {
        var project = AProject();
        var brand = ABrand();

        var state = ApiaryState.Empty.With(new ProjectSaved(project), new BrandSaved(project.Id, brand));

        Assert.Equal((brand, (VisitorBrand?)null), (state.Projects[project.Id].Brand, state.Brand));
    }

    [Fact]
    public void Saving_no_brand_for_a_project_clears_it()
    {
        var project = AProject() with { Brand = ABrand() };

        var state = ApiaryState.Empty.With(new ProjectSaved(project), new BrandSaved(project.Id, null));

        Assert.Null(state.Projects[project.Id].Brand);
    }

    [Fact]
    public void Saving_the_brand_of_a_project_that_doesn_t_exist_changes_nothing()
    {
        var state = ApiaryState.Empty;

        Assert.Same(state, state.With(new BrandSaved(AnId(), ABrand())));
    }

    [Fact]
    public void A_logo_is_shown_as_a_data_uri() =>
        Assert.Equal("data:image/png;base64,iVBORw0K", new BrandLogo("image/png", "iVBORw0K", "logo.png").DataUri);
}
