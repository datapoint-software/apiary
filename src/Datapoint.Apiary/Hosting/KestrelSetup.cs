using Microsoft.Extensions.Options;

namespace Datapoint.Apiary.Hosting;

public static class KestrelSetup
{
    public static WebApplicationBuilder AddApiaryListeners(this WebApplicationBuilder builder)
    {
        builder.WebHost.ConfigureKestrel((context, kestrel) =>
        {
            var options = kestrel.ApplicationServices.GetRequiredService<IOptions<ApiaryOptions>>().Value;
            var allowlist = AdminAllowlist.Create(
                options.AdminAllowlist,
                kestrel.ApplicationServices.GetRequiredService<ILogger<AdminAllowlist>>());
            kestrel.AddServerHeader = false;
            kestrel.ListenAnyIP(options.HttpPort);
            kestrel.ListenAnyIP(options.AdminPort, listen => listen.Use(allowlist.Guard));
        });
        return builder;
    }
}
