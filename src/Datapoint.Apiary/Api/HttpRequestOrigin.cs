using Datapoint.Apiary.Management.Transactions;

namespace Datapoint.Apiary.Api;

public sealed class HttpRequestOrigin(IHttpContextAccessor accessor) : IRequestOrigin
{
    public string? Address
    {
        get
        {
            var address = accessor.HttpContext?.Connection.RemoteIpAddress;
            return address is { IsIPv4MappedToIPv6: true } ? address.MapToIPv4().ToString() : address?.ToString();
        }
    }

    public string? Client => null;
}
