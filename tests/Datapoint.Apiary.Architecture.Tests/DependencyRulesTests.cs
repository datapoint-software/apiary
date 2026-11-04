namespace Datapoint.Apiary.Architecture.Tests;

public sealed class DependencyRulesTests
{
    private const string Security = "Datapoint.Apiary.Security";
    private const string Cluster = "Datapoint.Apiary.Cluster";
    private const string Certificates = "Datapoint.Apiary.Certificates";
    private const string Management = "Datapoint.Apiary.Management";
    private const string Proxy = "Datapoint.Apiary.Proxy";
    private const string Host = "Datapoint.Apiary";

    [Fact]
    public void Security_depends_on_no_Apiary_project() =>
        Assert.Empty(ProjectReferences.Of(Security));

    [Fact]
    public void Cluster_depends_only_on_Security() =>
        Assert.Equal([Security], ProjectReferences.Of(Cluster), StringComparer.Ordinal);

    [Fact]
    public void Proxy_depends_only_on_Cluster_and_Security() =>
        Assert.Equal([Cluster, Security], ProjectReferences.Of(Proxy), StringComparer.Ordinal);

    [Fact]
    public void Certificates_depends_only_on_Cluster_and_Security() =>
        Assert.Equal([Cluster, Security], ProjectReferences.Of(Certificates), StringComparer.Ordinal);

    [Fact]
    public void Management_depends_only_on_Certificates_Cluster_and_Security() =>
        Assert.Equal([Certificates, Cluster, Security], ProjectReferences.Of(Management), StringComparer.Ordinal);

    [Fact]
    public void The_host_references_Management_and_Proxy() =>
        Assert.Equal([Management, Proxy], ProjectReferences.Of(Host), StringComparer.Ordinal);

    [Fact]
    public void No_project_in_src_references_the_host() =>
        Assert.Empty(ProjectReferences.Referencing(Host));
}
