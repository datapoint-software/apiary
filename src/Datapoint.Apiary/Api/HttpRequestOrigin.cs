using Datapoint.Apiary.Auth;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Apiary.Replication;

namespace Datapoint.Apiary.Api;

public sealed class HttpRequestOrigin(IHttpContextAccessor accessor) : IRequestOrigin
{
    public string? Address => Forwarded is { } forwarded ? forwarded.Address : ConnectionAddress();

    public string? Client => Forwarded?.Client;

    public string? Device => Forwarded is { } forwarded ? forwarded.Device : DeviceNames.From(accessor.HttpContext?.Request.Headers.UserAgent.ToString());

    private ForwardedOrigin? Forwarded => accessor.HttpContext?.Features.Get<ForwardedOrigin>();

    private string? ConnectionAddress()
    {
        var address = accessor.HttpContext?.Connection.RemoteIpAddress;
        return address is { IsIPv4MappedToIPv6: true } ? address.MapToIPv4().ToString() : address?.ToString();
    }
}
