namespace Datapoint.Apiary.SingleSignOn;

public static class SsoSetup
{
    private const int MaxResponseSize = 1024 * 1024;

    public static IServiceCollection AddApiarySso(this IServiceCollection services)
    {
        services.AddHttpClient(SsoProviders.ClientName, client =>
        {
            client.Timeout = TimeSpan.FromSeconds(10);
            client.MaxResponseContentBufferSize = MaxResponseSize;
        });
        services.AddSingleton<SsoProviders>();
        services.AddSingleton<SsoFlowCookie>();
        services.AddScoped<SsoSignIn>();
        return services;
    }

    public static IEndpointRouteBuilder MapApiarySso(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet(SsoFlowCookie.Path + "/start", (HttpContext context, string? next, SsoSignIn signIn) => signIn.StartAsync(context, next));
        endpoints.MapGet(SsoFlowCookie.Path + "/callback", (HttpContext context, SsoSignIn signIn) => signIn.FinishAsync(context));
        return endpoints;
    }
}
