using System.Net;
using Datapoint.Apiary.Certificates.Selection;
using Datapoint.Apiary.Cluster.Raft;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Replication;
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
            var admin = kestrel.ApplicationServices.GetRequiredService<AdminCertificates>();
            kestrel.ListenAnyIP(options.AdminPort, listen =>
            {
                listen.Protocols = HttpProtocols.Http1AndHttp2;
                listen.Use(allowlist.Guard);
                listen.UseHttps(new TlsHandshakeCallbackOptions { OnConnection = _ => ValueTask.FromResult(admin.Options()) });
            });
            ListenForReplicas(kestrel, options);
        });
        return builder;
    }

    private static void ListenForReplicas(KestrelServerOptions kestrel, ApiaryOptions options)
    {
        var cluster = kestrel.ApplicationServices.GetRequiredService<RaftClusterState>();
        var mode = kestrel.ApplicationServices.GetRequiredService<IOptions<ClusterOptions>>().Value.Mode;
        var starting = TemporaryCertificate.Create(kestrel.ApplicationServices.GetRequiredService<TimeProvider>());
        kestrel.Listen(mode is ClusterMode.Swarm ? IPAddress.Any : IPAddress.Loopback, options.ClusterPort, listen =>
        {
            listen.Protocols = HttpProtocols.Http1AndHttp2;
            listen.UseHttps(https =>
            {
                https.ServerCertificateSelector = (_, _) => cluster.Credentials?.Certificate ?? starting;
                https.ClientCertificateMode = ClientCertificateMode.AllowCertificate;
                https.AllowAnyClientCertificate();
            });
        });
    }
}
