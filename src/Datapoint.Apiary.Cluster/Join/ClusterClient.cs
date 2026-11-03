using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Net.Security;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Cluster.Trust;
using Microsoft.Extensions.Options;

namespace Datapoint.Apiary.Cluster.Join;

public sealed class ClusterClient(IOptions<ClusterOptions> options) : IDisposable
{
    private static readonly TimeSpan s_timeout = TimeSpan.FromSeconds(15);
    [SuppressMessage("Security", "CA5359", Justification = "A joining replica can't know the cluster CA yet; JoinProtocol authenticates the response with an HMAC from the root key.")]
    private readonly HttpClient _anonymous = Create(new SslClientAuthenticationOptions
    {
        TargetHost = "apiary",
        RemoteCertificateValidationCallback = (_, _, _, _) => true,
    });
    private HttpClient? _trusted;
    private ReplicaCredentials? _credentials;

    public void Use(ReplicaCredentials credentials)
    {
        _credentials = credentials;
        if (_trusted is not null)
        {
            return;
        }

        var trusted = Create(ReplicaCredentials.ClientOptions(() => _credentials));
        if (Interlocked.CompareExchange(ref _trusted, trusted, null) is null)
        {
            return;
        }

        trusted.Dispose();
    }

    public async Task<JoinResponse?> JoinAsync(IPAddress peer, JoinRequest request, CancellationToken cancellationToken)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(5));
        try
        {
            using var response = await _anonymous.PostAsJsonAsync(Uri(peer, "join"), request, ClusterWireJsonContext.Default.JoinRequest, timeout.Token);
            return response.IsSuccessStatusCode
                ? await response.Content.ReadFromJsonAsync(ClusterWireJsonContext.Default.JoinResponse, timeout.Token)
                : null;
        }
        catch (Exception exception) when (exception is HttpRequestException or OperationCanceledException && !cancellationToken.IsCancellationRequested)
        {
            return null;
        }
    }

    public async Task<HttpResponseMessage> SendAsync(IPAddress peer, string path, HttpContent content, CancellationToken cancellationToken, TimeSpan? timeout = null)
    {
        using var limit = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        limit.CancelAfter(timeout ?? s_timeout);
        try
        {
            return await Trusted.PostAsync(Uri(peer, path), content, limit.Token);
        }
        catch (OperationCanceledException exception) when (!cancellationToken.IsCancellationRequested)
        {
            throw new HttpRequestException("The replica didn't answer in time.", exception);
        }
    }

    public async Task<HttpResponseMessage> GetAsync(IPAddress peer, string path, CancellationToken cancellationToken)
    {
        using var limit = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        limit.CancelAfter(TimeSpan.FromSeconds(5));
        return await Trusted.GetAsync(Uri(peer, path), limit.Token);
    }

    public void Dispose()
    {
        _anonymous.Dispose();
        _trusted?.Dispose();
    }

    private HttpClient Trusted => _trusted ?? throw new ClusterUnavailableException("This replica hasn't joined the cluster yet.");

    private Uri Uri(IPAddress peer, string path) =>
        new(string.Create(CultureInfo.InvariantCulture, $"https://{new IPEndPoint(peer, options.Value.ClusterPort)}/cluster/{path}"));

    private static HttpClient Create(SslClientAuthenticationOptions ssl)
    {
        var handler = new SocketsHttpHandler
        {
            SslOptions = ssl,
            ConnectTimeout = TimeSpan.FromSeconds(3),
            PooledConnectionLifetime = TimeSpan.FromMinutes(5),
            KeepAlivePingDelay = TimeSpan.FromSeconds(2),
            KeepAlivePingTimeout = TimeSpan.FromSeconds(2),
            KeepAlivePingPolicy = HttpKeepAlivePingPolicy.Always,
        };
        return new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan, DefaultRequestVersion = HttpVersion.Version20, DefaultVersionPolicy = HttpVersionPolicy.RequestVersionOrLower };
    }
}
