using Datapoint.Apiary.Certificates.Selection;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.AspNetCore.Server.Kestrel.Https;
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
            var certificates = kestrel.ApplicationServices.GetRequiredService<CertificateSelector>();
            kestrel.ListenAnyIP(options.HttpsPort, listen =>
            {
                listen.Protocols = HttpProtocols.Http1AndHttp2AndHttp3;
                listen.DisableAltSvcHeader = true;
                listen.UseHttps(new TlsHandshakeCallbackOptions
                {
                    OnConnection = connection => ValueTask.FromResult(certificates.OptionsFor(connection.ClientHelloInfo.ServerName)),
                });
            });
            kestrel.ListenAnyIP(options.AdminPort, listen => listen.Use(allowlist.Guard));
        });
        return builder;
    }
}
