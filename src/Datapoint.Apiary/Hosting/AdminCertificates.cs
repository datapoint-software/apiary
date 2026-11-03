using System.Net.Security;
using System.Security.Cryptography;
using Datapoint.Apiary.Certificates.Bundles;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Replication;

namespace Datapoint.Apiary.Hosting;

public sealed partial class AdminCertificates(IClusterState cluster, TimeProvider time, ILogger<AdminCertificates> logger)
{
    private readonly Lazy<SslStreamCertificateContext> _starting = new(() => SslStreamCertificateContext.Create(TemporaryCertificate.Create(time), additionalCertificates: null, offline: true));
    private (string Thumbprint, SslStreamCertificateContext? Context)? _loaded;

    public SslServerAuthenticationOptions Options() => new() { ServerCertificateContext = Current() ?? _starting.Value };

    private SslStreamCertificateContext? Current()
    {
        if (cluster.Current.AdminCertificate?.Material is not { } material)
        {
            return null;
        }

        if (_loaded is { } loaded && loaded.Thumbprint == material.Thumbprint)
        {
            return loaded.Context;
        }

        SslStreamCertificateContext? context;
        try
        {
            context = CertificateBundle.Context(material);
        }
        catch (CryptographicException exception)
        {
            LogLoadFailed(exception);
            context = null;
        }

        _loaded = (material.Thumbprint, context);
        return context;
    }

    [LoggerMessage(Level = LogLevel.Error, Message = "The admin interface's certificate can't be loaded, so it uses a temporary self-signed one")]
    private partial void LogLoadFailed(Exception exception);
}
