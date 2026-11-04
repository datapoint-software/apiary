using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Text.Json.Nodes;
using Datapoint.Apiary.Security.Network;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;

namespace Datapoint.Apiary.Tests.Hosting;

internal sealed class Backend : IAsyncDisposable
{
    private readonly WebApplication _app;

    private Backend(WebApplication app, IPAddress address, int port, string name)
    {
        _app = app;
        Address = address;
        Port = port;
        Name = name;
    }

    public IPAddress Address { get; }

    public int Port { get; }

    public string Name { get; }

    public static IPAddress? RoutableAddress() =>
        NetworkInterface.GetAllNetworkInterfaces()
            .Where(i => i.OperationalStatus is OperationalStatus.Up)
            .SelectMany(i => i.GetIPProperties().UnicastAddresses)
            .Select(a => a.Address)
            .FirstOrDefault(a => a.AddressFamily is AddressFamily.InterNetwork && AddressPolicy.Classify(a) is AddressKind.Routable);

    public static async Task<Backend> StartAsync(string name = "web")
    {
        var address = RoutableAddress() ?? throw new InvalidOperationException("No routable IPv4 address to run a backend on.");
        var port = ApiaryApp.FreePort();
        var builder = WebApplication.CreateSlimBuilder();
        builder.WebHost.ConfigureKestrel(k =>
        {
            k.Listen(address, port);
            k.Limits.MaxRequestBodySize = null;
        });
        var app = builder.Build();
        app.Run(async context =>
        {
            var received = await ReceivedBytesAsync(context.Request.Body, context.RequestAborted);
            var headers = new JsonObject();
            foreach (var (key, value) in context.Request.Headers)
            {
                headers[key.ToLowerInvariant()] = value.ToString();
            }

            context.Response.Headers.CacheControl = context.Request.Query["cache"].ToString() is { Length: > 0 } cache ? cache : "no-store";
            await context.Response.WriteAsJsonAsync(new JsonObject
            {
                ["backend"] = name,
                ["received"] = received,
                ["path"] = context.Request.Path.Value + context.Request.QueryString.Value,
                ["headers"] = headers,
                ["at"] = DateTimeOffset.UtcNow.Ticks,
            });
        });
        await app.StartAsync(TestContext.Current.CancellationToken);
        return new Backend(app, address, port, name);
    }

    private static async Task<long> ReceivedBytesAsync(Stream body, CancellationToken ct)
    {
        var buffer = new byte[81920];
        long total = 0;
        var read = await body.ReadAsync(buffer, ct);
        while (read > 0)
        {
            total += read;
            read = await body.ReadAsync(buffer, ct);
        }

        return total;
    }

    public async ValueTask DisposeAsync()
    {
        await _app.StopAsync(CancellationToken.None);
        await _app.DisposeAsync();
    }
}
