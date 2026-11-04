using System.Net;

namespace Datapoint.Apiary.Tests.Hosting;

public sealed class StartupTests
{
    [Fact]
    public async Task A_standalone_replica_starts_and_says_it_s_ready()
    {
        await using var app = await ApiaryApp.StartAsync();
        using var client = Clients.Admin(app);

        using var response = await client.GetAsync(new Uri("/health/ready", UriKind.Relative), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
