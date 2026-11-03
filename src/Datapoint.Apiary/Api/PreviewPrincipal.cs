using System.Security.Claims;
using Datapoint.Apiary.Management.Authorization;

namespace Datapoint.Apiary.Api;

public static class PreviewPrincipal
{
    private static readonly ClaimsPrincipal s_principal = new(new ClaimsIdentity(
        [new Claim(ClaimTypes.Name, "preview"), new Claim(ClaimTypes.Role, nameof(Role.Administrator))],
        authenticationType: "preview"));

    public static IApplicationBuilder UsePreviewPrincipal(this IApplicationBuilder app) => app.Use(async (context, next) =>
    {
        context.User = s_principal;
        await next(context);
    });
}
