using System.Net;
using Datapoint.Apiary.Security.Network;

namespace Datapoint.Apiary.Management.Validation;

public static class TargetRules
{
    public static AddressKind Classify(string host)
    {
        if (AddressPolicy.IsLoopbackName(host))
        {
            return AddressKind.Loopback;
        }

        return IPAddress.TryParse(host.Trim('[', ']'), out var address) ? AddressPolicy.Classify(address) : AddressKind.Routable;
    }

    public static bool IsAddress(string host) => IPAddress.TryParse(host.Trim('[', ']'), out _);
}
