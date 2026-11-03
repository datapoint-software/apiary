using Yarp.ReverseProxy.Forwarder;

namespace Datapoint.Apiary.Proxy.Network;

public sealed class GuardedForwarderHttpClientFactory(TargetConnector connector) : ForwarderHttpClientFactory
{
    protected override void ConfigureHandler(ForwarderHttpClientContext context, SocketsHttpHandler handler)
    {
        base.ConfigureHandler(context, handler);
        handler.ConnectCallback = connector.ConnectAsync;
    }
}
