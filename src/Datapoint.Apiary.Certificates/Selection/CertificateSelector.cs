using System.Collections.Frozen;
using System.Net.Security;
using System.Security.Authentication;
using System.Security.Cryptography.X509Certificates;
using Datapoint.Apiary.Certificates.Bundles;
using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Cluster.State;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Primitives;

namespace Datapoint.Apiary.Certificates.Selection;

public sealed partial class CertificateSelector : IDisposable
{
    private readonly IClusterState _cluster;
    private readonly ILogger<CertificateSelector> _logger;
    private readonly IDisposable _subscription;
    private readonly Lock _gate = new();
    private Dictionary<string, SslStreamCertificateContext> _contexts = new(StringComparer.Ordinal);
    private FrozenDictionary<string, SslStreamCertificateContext> _byHost = FrozenDictionary<string, SslStreamCertificateContext>.Empty;
    private long _builtAt = -1;

    public CertificateSelector(IClusterState cluster, ILogger<CertificateSelector> logger)
    {
        _cluster = cluster;
        _logger = logger;
        _subscription = ChangeToken.OnChange(cluster.GetChangeToken, Rebuild);
    }

    public bool Has(string host) => Current().ContainsKey(host.ToLowerInvariant());

    public SslServerAuthenticationOptions OptionsFor(string? serverName)
    {
        if (serverName is null || !Current().TryGetValue(serverName.ToLowerInvariant(), out var context))
        {
            throw new AuthenticationException("No certificate for this hostname.");
        }

        return new SslServerAuthenticationOptions { ServerCertificateContext = context };
    }

    public void Dispose() => _subscription.Dispose();

    private FrozenDictionary<string, SslStreamCertificateContext> Current()
    {
        if (_builtAt != _cluster.Current.Index)
        {
            Rebuild();
        }

        return _byHost;
    }

    private void Rebuild()
    {
        lock (_gate)
        {
            var state = _cluster.Current;
            if (_builtAt == state.Index)
            {
                return;
            }

            var automatic = state.Certificates.Values
                .Where(c => c.Source == CertificateSource.Automatic && c.Material is not null)
                .GroupBy(c => c.Name, StringComparer.Ordinal)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(c => c.Material!.NotAfter).First(), StringComparer.Ordinal);
            var contexts = new Dictionary<string, SslStreamCertificateContext>(StringComparer.Ordinal);
            var byHost = new Dictionary<string, SslStreamCertificateContext>(StringComparer.Ordinal);
            foreach (var route in state.Routes.Values)
            {
                var certificate = route.CertificateId is { } id
                    ? state.Certificates.GetValueOrDefault(id)
                    : automatic.GetValueOrDefault(route.Host);
                if (certificate?.Material is { } material && material.Covers(route.Host) && ContextFor(certificate.Name, material, contexts) is { } context)
                {
                    byHost[route.Host] = context;
                }
            }

            _contexts = contexts;
            _byHost = byHost.ToFrozenDictionary(StringComparer.Ordinal);
            _builtAt = state.Index;
        }
    }

    private SslStreamCertificateContext? ContextFor(string name, CertificateMaterial material, Dictionary<string, SslStreamCertificateContext> contexts)
    {
        if (contexts.TryGetValue(material.Thumbprint, out var context))
        {
            return context;
        }

        context = _contexts.GetValueOrDefault(material.Thumbprint) ?? Load(name, material);
        if (context is not null)
        {
            contexts[material.Thumbprint] = context;
        }

        return context;
    }

    private SslStreamCertificateContext? Load(string name, CertificateMaterial material)
    {
        var chain = CertificateBundle.ReadChain(material.ChainPem);
        try
        {
            using var withKey = CertificateBundle.WithKey(chain[0], material.KeyPem);
            if (withKey is null)
            {
                return null;
            }

            var leaf = X509CertificateLoader.LoadPkcs12(withKey.Export(X509ContentType.Pkcs12), password: null);
            return SslStreamCertificateContext.Create(leaf, [.. chain.Skip(1)], offline: true);
        }
        catch (System.Security.Cryptography.CryptographicException exception)
        {
            LogLoadFailed(exception, name);
            return null;
        }
        finally
        {
            chain[0].Dispose();
        }
    }

    [LoggerMessage(Level = LogLevel.Error, Message = "The certificate for {Name} can't be loaded, so its hostnames get no HTTPS")]
    private partial void LogLoadFailed(Exception exception, string name);
}
