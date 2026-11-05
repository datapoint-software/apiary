using Datapoint.Apiary.Cluster.Streams;
using Datapoint.Apiary.Stacks;

namespace Datapoint.Apiary.Tests.Stacks;

public sealed class StackFileReaderTests
{
    private static readonly Dictionary<string, string> s_environment = new(StringComparer.Ordinal) { ["DOMAIN"] = "example.com", ["EMPTY"] = "" };

    [Fact]
    public void Labels_as_a_map_declare_a_named_route_to_the_service()
    {
        var file = Read("""
            services:
              web:
                image: shop/web
                deploy:
                  labels:
                    apiary.project: Shop
                    apiary.route.site.host: shop.example.com
                    apiary.route.site.port: "8080"
                    apiary.route.api.host: shop.example.com
                    apiary.route.api.path: /api
                    apiary.route.api.port: 9000
                    apiary.route.api.timeout: 120
                    com.example.team: shop
            """);

        Assert.Empty(file.Errors);
        Assert.Equal(1, file.Services);
        Assert.Equal(7, file.Labels);
        var site = Assert.Single(file.Routes, r => r.Name == "site");
        Assert.Equal(("web", "shop.example.com", 8080, "/", "Shop"), (site.Service, site.Host, site.Port, site.Path, site.Project));
        var api = Assert.Single(file.Routes, r => r.Name == "api");
        Assert.Equal(("/api", 120), (api.Path, api.TimeoutSeconds));
    }

    [Fact]
    public void Labels_as_a_list_and_variables_are_read_like_docker_stack_deploy_reads_them()
    {
        var file = Read("""
            services:
              web:
                deploy:
                  labels:
                    - apiary.route.site.host=shop.${DOMAIN}
                    - apiary.route.site.port=${PORT:-8080}
                    - apiary.route.site.path=/$$cash
                    - apiary.route.site.project=${EMPTY:-Shop}
            """);

        var site = Assert.Single(file.Routes);
        Assert.Equal(("shop.example.com", 8080, "/$cash", "Shop"), (site.Host, site.Port, site.Path, site.Project));
    }

    [Fact]
    public void Streams_and_redirects_have_their_own_labels()
    {
        var file = Read("""
            services:
              db:
                deploy:
                  labels:
                    apiary.stream.postgres.listen: 5432
                    apiary.stream.postgres.port: 5432
                    apiary.stream.dns.protocol: udp
                    apiary.stream.dns.listen: 53
                    apiary.stream.dns.port: 5353
              web:
                deploy:
                  labels:
                    apiary.redirect.old.from: old.example.com
                    apiary.redirect.old.to: https://shop.example.com
                    apiary.redirect.old.status: 301
                    apiary.redirect.old.keep-path: "true"
            """);

        Assert.Empty(file.Errors);
        Assert.Equal(StreamProtocol.Tcp, Assert.Single(file.StreamRoutes, s => s.Name == "postgres").Protocol);
        Assert.Equal((StreamProtocol.Udp, 53, 5353), Assert.Single(file.StreamRoutes, s => s.Name == "dns") is var dns ? (dns.Protocol, dns.ListenPort, dns.Port) : default);
        var redirect = Assert.Single(file.Redirects);
        Assert.Equal(("web", "old.example.com", "https://shop.example.com", 301, true), (redirect.Service, redirect.From, redirect.To, redirect.StatusCode, redirect.KeepPath));
    }

    [Fact]
    public void Services_without_apiary_labels_declare_nothing()
    {
        var file = Read("""
            services:
              worker:
                image: shop/worker
              cache:
                deploy:
                  replicas: 2
            """);

        Assert.Empty(file.Errors);
        Assert.Equal((2, 0, 0), (file.Services, file.Labels, file.Routes.Count));
    }

    [Theory]
    [InlineData("apiary.routes.site.host: a.example.com", "web: apiary.routes.site.host isn't an Apiary label.")]
    [InlineData("apiary.route.site.hostname: a.example.com", "web: apiary.route.site.hostname isn't a setting Apiary reads from labels.")]
    [InlineData("apiary.route.site.host: a.example.com", "web: apiary.route.site.port is required.")]
    [InlineData("apiary.stream.db.listen: many", "web: apiary.stream.db.listen is a whole number.")]
    [InlineData("apiary.stream.db.protocol: sctp", "web: apiary.stream.db.protocol is tcp or udp.")]
    [InlineData("apiary.redirect.old.keep-path: yes", "web: apiary.redirect.old.keep-path is true or false.")]
    public void Mistakes_in_labels_are_reported_with_the_service_and_label(string label, string error)
    {
        var file = Read($"""
            services:
              web:
                deploy:
                  labels:
                    {label}
            """);

        Assert.Contains(file.Errors, e => e.StartsWith(error, StringComparison.Ordinal));
    }

    [Theory]
    [InlineData("services: [", "The stack file isn't valid YAML")]
    [InlineData("version: '3.8'", "The stack file has no services section.")]
    [InlineData("", "The stack file must be one YAML document")]
    public void A_file_that_isn_t_a_stack_file_is_reported(string yaml, string error)
    {
        var file = Read(yaml);

        Assert.StartsWith(error, Assert.Single(file.Errors), StringComparison.Ordinal);
    }

    private static StackFile Read(string yaml)
    {
        using var reader = new StringReader(yaml);
        return StackFileReader.Read(reader, s_environment.GetValueOrDefault);
    }
}
