using Datapoint.Apiary.Management.Transactions;

namespace Datapoint.Apiary.Management.Tests.Fakes;

public sealed class TestOrigin : IRequestOrigin
{
    public string? Address => "192.0.2.10";

    public string? Client => "Firefox";

    public string? Device => "Firefox on Linux";
}
