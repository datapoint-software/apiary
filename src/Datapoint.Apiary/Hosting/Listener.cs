using Microsoft.Extensions.Options;

namespace Datapoint.Apiary.Hosting;

public static class Listener
{
    public static bool IsAdmin(HttpContext context) =>
        context.Connection.LocalPort == context.RequestServices.GetRequiredService<IOptions<ApiaryOptions>>().Value.AdminPort;
}
