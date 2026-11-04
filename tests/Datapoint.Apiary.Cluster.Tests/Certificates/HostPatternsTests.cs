using Datapoint.Apiary.Cluster.Certificates;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Cluster.Tests.Certificates;

public sealed class HostPatternsTests
{
    [Fact]
    public void A_hostname_covers_itself() =>
        Assert.True(HostPatterns.Covers("shop.example.com", "shop.example.com"));

    [Fact]
    public void A_hostname_covers_itself_in_any_case() =>
        Assert.True(HostPatterns.Covers("Shop.Example.com", "shop.example.COM"));

    [Fact]
    public void A_hostname_doesn_t_cover_another() =>
        Assert.False(HostPatterns.Covers("shop.example.com", "blog.example.com"));

    [Fact]
    public void A_wildcard_covers_one_label() =>
        Assert.True(HostPatterns.Covers("*.example.com", "shop.example.com"));

    [Fact]
    public void A_wildcard_covers_one_label_in_any_case() =>
        Assert.True(HostPatterns.Covers("*.EXAMPLE.com", "shop.example.com"));

    [Fact]
    public void A_wildcard_doesn_t_cover_two_labels() =>
        Assert.False(HostPatterns.Covers("*.example.com", "a.shop.example.com"));

    [Fact]
    public void A_wildcard_doesn_t_cover_its_own_domain() =>
        Assert.False(HostPatterns.Covers("*.example.com", "example.com"));

    [Fact]
    public void A_wildcard_doesn_t_cover_a_host_with_no_label_before_the_dot() =>
        Assert.False(HostPatterns.Covers("*.example.com", ".example.com"));

    [Fact]
    public void A_wildcard_doesn_t_cover_another_domain() =>
        Assert.False(HostPatterns.Covers("*.example.com", "shop.example.org"));

    [Fact]
    public void Certificate_material_covers_a_host_that_any_of_its_names_covers() =>
        Assert.True(SomeMaterial("example.com", "*.example.com").Covers("shop.example.com"));

    [Fact]
    public void Certificate_material_doesn_t_cover_a_host_that_none_of_its_names_covers() =>
        Assert.False(SomeMaterial("example.com", "*.example.com").Covers("example.org"));
}
