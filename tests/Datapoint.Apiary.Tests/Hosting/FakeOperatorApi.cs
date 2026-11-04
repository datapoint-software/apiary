using System.Net;
using System.Security.Cryptography.X509Certificates;
using Datapoint.Apiary.Api;
using Datapoint.Apiary.Auth;
using Datapoint.Apiary.Cluster.Recovery;
using Datapoint.Apiary.Testing.Certificates;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace Datapoint.Apiary.Tests.Hosting;

internal sealed class FakeOperatorApi : IAsyncDisposable
{
    public const string Token = "local-operator-token";

    private readonly WebApplication _app;
    private int _starts;

    private FakeOperatorApi(WebApplication app, int port)
    {
        _app = app;
        Port = port;
    }

    public int Port { get; }

    public int Starts => Volatile.Read(ref _starts);

    public static async Task<FakeOperatorApi> StartAsync(RecoveryPlan plan, int startStatus = StatusCodes.Status202Accepted)
    {
        var port = ApiaryApp.FreePort();
        var builder = WebApplication.CreateSlimBuilder();
        var certificate = Certificate();
        builder.WebHost.ConfigureKestrel(k => k.Listen(IPAddress.Loopback, port, o => o.UseHttps(certificate)));
        var app = builder.Build();
        var api = new FakeOperatorApi(app, port);
        app.Use(async (context, next) =>
        {
            if (context.Request.Headers.Authorization != LocalOperatorAuthenticationHandler.Prefix + Token)
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return;
            }

            await next(context);
        });
        app.MapPost("/operator/recovery/plan", () => Results.Json(plan, ApiJson.Options));
        app.MapPost("/operator/recovery/start", () =>
        {
            Interlocked.Increment(ref api._starts);
            return Results.Json(new { code = RecoveryRefusedException.NotMostRecent }, ApiJson.Options, statusCode: startStatus);
        });
        await app.StartAsync(TestContext.Current.CancellationToken);
        return api;
    }

    public async ValueTask DisposeAsync()
    {
        await _app.StopAsync(CancellationToken.None);
        await _app.DisposeAsync();
    }

    private static X509Certificate2 Certificate()
    {
        var pem = TestCertificates.SelfSigned("localhost");
        using var loaded = X509Certificate2.CreateFromPem(pem.ChainPem, pem.KeyPem);
        return X509CertificateLoader.LoadPkcs12(loaded.Export(X509ContentType.Pkcs12), null);
    }
}
