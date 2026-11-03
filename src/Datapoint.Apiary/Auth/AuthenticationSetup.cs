using Datapoint.Apiary.Management.Accounts;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.DataProtection.KeyManagement;
using Microsoft.AspNetCore.DataProtection.XmlEncryption;

namespace Datapoint.Apiary.Auth;

public static class AuthenticationSetup
{
    public static IServiceCollection AddApiaryAuthentication(this IServiceCollection services)
    {
        services.Configure<KeyManagementOptions>(o =>
        {
            o.XmlRepository = new InMemoryKeyRing();
            o.XmlEncryptor = new NullXmlEncryptor();
        });
        services.AddSingleton<LocalOperatorToken>();
        services.AddScoped<ISessionCookie, SessionCookie>();
        services.AddAuthentication(AuthenticationSchemes.Default)
            .AddPolicyScheme(AuthenticationSchemes.Default, null, o => o.ForwardDefaultSelector = context =>
                context.Request.Headers.Authorization.ToString().StartsWith(LocalOperatorAuthenticationHandler.Prefix, StringComparison.Ordinal)
                    ? AuthenticationSchemes.LocalOperator
                    : AuthenticationSchemes.Session)
            .AddScheme<AuthenticationSchemeOptions, SessionAuthenticationHandler>(AuthenticationSchemes.Session, null)
            .AddScheme<AuthenticationSchemeOptions, LocalOperatorAuthenticationHandler>(AuthenticationSchemes.LocalOperator, null);
        return services;
    }
}
