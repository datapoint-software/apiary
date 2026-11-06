using System.Net;
using System.Text;
using Datapoint.Apiary.Certificates.DnsProviders;

namespace Datapoint.Apiary.Certificates.Tests.Fakes;

public sealed class FakeProviderApi : HttpMessageHandler
{
    private readonly Dictionary<string, Queue<(HttpStatusCode Status, string Body)>> _answers = new(StringComparer.Ordinal);

    public IList<string> Requests { get; } = new List<string>();

    public IList<string> Bodies { get; } = new List<string>();

    public IList<string?> Authorizations { get; } = new List<string?>();

    public Exception? Failure { get; set; }

    public DnsProviderHttp Http() => new(new HttpClient(this));

    public FakeProviderApi On(string method, string path, string body, HttpStatusCode status = HttpStatusCode.OK)
    {
        var key = $"{method} {path}";
        _answers.TryAdd(key, new Queue<(HttpStatusCode, string)>());
        _answers[key].Enqueue((status, body));
        return this;
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        if (Failure is { } failure)
        {
            throw failure;
        }

        var uri = request.RequestUri!;
        Requests.Add($"{request.Method} {Uri.UnescapeDataString(uri.PathAndQuery)}");
        Bodies.Add(request.Content is null ? "" : await request.Content.ReadAsStringAsync(cancellationToken));
        Authorizations.Add(request.Headers.Authorization?.ToString());
        var (status, body) = Answer($"{request.Method} {uri.Host}{Uri.UnescapeDataString(uri.AbsolutePath)}");
        return new HttpResponseMessage(status) { Content = new StringContent(body, Encoding.UTF8, "application/json") };
    }

    private (HttpStatusCode, string) Answer(string key)
    {
        if (!_answers.TryGetValue(key, out var answers))
        {
            return (HttpStatusCode.NotFound, "{}");
        }

        return answers.Count > 1 ? answers.Dequeue() : answers.Peek();
    }
}
