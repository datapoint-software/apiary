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
        services.AddSingleton<SessionActivity>();
        services.AddScoped<ISessionCookie, SessionCookie>();
        services.AddAuthentication(AuthenticationSchemes.Default)
            .AddPolicyScheme(AuthenticationSchemes.Default, null, o => o.ForwardDefaultSelector = context => Scheme(context.Request.Headers.Authorization.ToString()))
            .AddScheme<AuthenticationSchemeOptions, SessionAuthenticationHandler>(AuthenticationSchemes.Session, null)
            .AddScheme<AuthenticationSchemeOptions, AgentAuthenticationHandler>(AuthenticationSchemes.Agent, null)
            .AddScheme<AuthenticationSchemeOptions, LocalOperatorAuthenticationHandler>(AuthenticationSchemes.LocalOperator, null)
            .AddScheme<AuthenticationSchemeOptions, PipelineAuthenticationHandler>(AuthenticationSchemes.Pipeline, null);
        return services;
    }

    private static string Scheme(string authorization)
    {
        if (authorization.StartsWith(LocalOperatorAuthenticationHandler.Prefix, StringComparison.Ordinal))
        {
            return AuthenticationSchemes.LocalOperator;
        }

        return PipelineAuthenticationHandler.IsPipelineToken(authorization) ? AuthenticationSchemes.Pipeline : AuthenticationSchemes.Session;
    }
}
