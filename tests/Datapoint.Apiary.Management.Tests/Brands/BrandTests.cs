using System.Text;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Brands;
using Datapoint.Apiary.Management.Errors;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Management.Tests.Brands;

public sealed class BrandTests : IDisposable
{
    private const string Png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    private readonly ManagementHost _host = new();

    public BrandTests() => _host.SignedIn(Role.Operator);

    public void Dispose() => _host.Dispose();

    [Fact]
    public async Task Saving_the_cluster_brand_normalizes_it()
    {
        await _host.SendAsync(new SaveBrand(null, " Example ", "#00aaff", "  "));

        Assert.Equal(("Example", "#00AAFF", (string?)null), (_host.State.Brand?.Name, _host.State.Brand?.Accent, _host.State.Brand?.Contact));
    }

    [Fact]
    public async Task A_project_has_its_own_brand()
    {
        var project = _host.AProjectIn();

        await _host.SendAsync(new SaveBrand(project.Id, "Shop", "#00AAFF"));

        Assert.Equal(("Shop", null), (_host.State.Projects[project.Id].Brand?.Name, _host.State.Brand));
    }

    [Fact]
    public async Task A_brand_for_an_unknown_project_is_refused() =>
        Assert.Contains("ProjectId: project.notFound", await _host.ErrorsAsync(new SaveBrand(AnId(), "Shop", "#00AAFF")));

    [Theory]
    [InlineData("00AAFF")]
    [InlineData("#0AF")]
    [InlineData("#00AAFG")]
    [InlineData("blue")]
    public async Task An_accent_that_isn_t_a_hex_color_is_refused(string accent) =>
        Assert.Contains("Accent: brand.accentInvalid", await _host.ErrorsAsync(new SaveBrand(null, "Example", accent)));

    [Fact]
    public async Task A_png_logo_is_kept()
    {
        await _host.SendAsync(new SaveBrand(null, "Example", "#00AAFF", Logo: Png, LogoName: "logo.png"));

        Assert.Equal(("image/png", "logo.png"), (_host.State.Brand?.Logo?.ContentType, _host.State.Brand?.Logo?.FileName));
    }

    [Fact]
    public async Task An_svg_logo_is_kept()
    {
        await _host.SendAsync(new SaveBrand(null, "Example", "#00AAFF", Logo: Svg("<svg xmlns=\"http://www.w3.org/2000/svg\"/>")));

        Assert.Equal("image/svg+xml", _host.State.Brand?.Logo?.ContentType);
    }

    [Fact]
    public async Task A_logo_of_another_type_is_refused() =>
        Assert.Contains("Logo: brand.logoType", await _host.ErrorsAsync(new SaveBrand(null, "Example", "#00AAFF", Logo: "data:image/gif;base64,R0lGODlh")));

    [Fact]
    public async Task A_logo_over_100_kb_is_refused() =>
        Assert.Contains("Logo: brand.logoTooLarge", await _host.ErrorsAsync(new SaveBrand(null, "Example", "#00AAFF", Logo: "data:image/png;base64," + Convert.ToBase64String(new byte[(100 * 1024) + 1]))));

    [Fact]
    public async Task A_logo_whose_content_isn_t_its_type_is_refused() =>
        Assert.Contains("Logo: brand.logoInvalid", await _host.ErrorsAsync(new SaveBrand(null, "Example", "#00AAFF", Logo: "data:image/png;base64," + Convert.ToBase64String("<svg/>"u8.ToArray()))));

    [Fact]
    public async Task An_svg_with_entities_is_refused() =>
        Assert.Contains("Logo: brand.logoInvalid", await _host.ErrorsAsync(new SaveBrand(null, "Example", "#00AAFF", Logo: Svg("<?xml version=\"1.0\"?><!DOCTYPE svg [<!ENTITY x \"y\">]><svg/>"))));

    [Fact]
    public async Task Removing_the_cluster_brand_clears_it()
    {
        await _host.SendAsync(new SaveBrand(null, "Example", "#00AAFF"));

        await _host.SendAsync(new RemoveBrand(null));

        Assert.Null(_host.State.Brand);
    }

    [Fact]
    public async Task Removing_the_brand_of_an_unknown_project_fails() =>
        Assert.Equal(ErrorCodes.ProjectNotFound, await _host.FailureAsync(new RemoveBrand(AnId())));

    private static string Svg(string text) => "data:image/svg+xml;base64," + Convert.ToBase64String(Encoding.UTF8.GetBytes(text));
}
