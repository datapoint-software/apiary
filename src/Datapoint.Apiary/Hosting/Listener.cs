using Microsoft.Extensions.Options;

namespace Datapoint.Apiary.Hosting;

public static class Listener
{
    public static ListenerKind Kind(HttpContext context)
    {
        var options = context.RequestServices.GetRequiredService<IOptions<ApiaryOptions>>().Value;
        var port = context.Connection.LocalPort;
        return port == options.AdminPort ? ListenerKind.Admin
            : port == options.ClusterPort ? ListenerKind.Cluster
            : ListenerKind.Public;
    }

    public static bool IsAdmin(HttpContext context) => Kind(context) is ListenerKind.Admin;

    public static bool IsPublic(HttpContext context) => Kind(context) is ListenerKind.Public;
}
