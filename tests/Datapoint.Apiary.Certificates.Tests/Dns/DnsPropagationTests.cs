using Datapoint.Apiary.Certificates.Dns;
using Datapoint.Apiary.Certificates.Tests.Fakes;
using Datapoint.Apiary.Testing;
using Microsoft.Extensions.Time.Testing;

namespace Datapoint.Apiary.Certificates.Tests.Dns;

public sealed class DnsPropagationTests : IAsyncDisposable
{
    private const string Name = "_acme-challenge.shop.example.com";
    private readonly FakeTimeProvider _time = TestClock.Fake();
    private readonly FakeDnsServer _dns = new FakeDnsServer().Zone("example.com");
    private readonly DnsPropagation _propagation;

    public DnsPropagationTests() => _propagation = new DnsPropagation(DnsLookupTests.Lookup(_dns), _time);

    public ValueTask DisposeAsync() => _dns.DisposeAsync();

    [Fact]
    public async Task Returns_once_every_name_server_shows_the_record()
    {
        _dns.Record(Name, DnsRecordType.Txt, "value");

        var waited = await _propagation.WaitAsync(Name, "value", TestContext.Current.CancellationToken);

        Assert.Equal(TimeSpan.Zero, waited);
    }

    [Fact]
    public async Task Gives_up_after_two_minutes()
    {
        var waiting = _propagation.WaitAsync(Name, "value", TestContext.Current.CancellationToken);

        var exception = await AdvanceUntilFailedAsync(waiting);

        Assert.Equal(DnsErrors.NotPropagated, exception.Code);
    }

    private async Task<DnsException> AdvanceUntilFailedAsync(Task task)
    {
        while (!task.IsCompleted)
        {
            _time.Advance(DnsPropagation.Interval);
            await Task.Delay(10, TestContext.Current.CancellationToken);
        }

        return Assert.IsType<DnsException>(task.Exception?.InnerException);
    }
}
