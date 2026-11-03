using System.Text.Json.Serialization;
using Datapoint.Apiary.Cluster.Agents;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Agents;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Mediator;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Primitives;

namespace Datapoint.Apiary.Auth;

public static class OAuthEndpoints
{
    public const string McpPath = "/mcp";

    private const string ResourceMetadataPath = "/.well-known/oauth-protected-resource";
    private const string ServerMetadataPath = "/.well-known/oauth-authorization-server";
    private const int MaxRequestSize = 16 * 1024;
    private static readonly string[] s_grantTypes = ["authorization_code", "refresh_token"];
    private static readonly string[] s_responseTypes = ["code"];
    private static readonly string[] s_none = ["none"];

    public static string ResourceMetadataUrl(HttpRequest request) => Base(request) + ResourceMetadataPath + McpPath;

    public static IEndpointRouteBuilder MapApiaryOAuth(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet(ResourceMetadataPath, ResourceMetadata);
        endpoints.MapGet(ResourceMetadataPath + McpPath, ResourceMetadata);
        endpoints.MapGet(ServerMetadataPath, ServerMetadata);
        endpoints.MapGet("/oauth/authorize", Authorize);
        endpoints.MapPost("/oauth/register", Register).WithMetadata(new RequestSizeLimitAttribute(MaxRequestSize));
        endpoints.MapPost("/oauth/token", TokenAsync).WithMetadata(new RequestSizeLimitAttribute(MaxRequestSize)).DisableAntiforgery();
        endpoints.MapPost("/oauth/revoke", RevokeAsync).WithMetadata(new RequestSizeLimitAttribute(MaxRequestSize)).DisableAntiforgery();
        return endpoints;
    }

    private static string Base(HttpRequest request) => $"{request.Scheme}://{request.Host}";

    private static IResult ResourceMetadata(HttpRequest request) => Results.Json(new ResourceMetadataDocument(
        Base(request) + McpPath,
        [Base(request)],
        ["header"],
        "Apiary"));

    private static IResult ServerMetadata(HttpRequest request)
    {
        var issuer = Base(request);
        return Results.Json(new ServerMetadataDocument(
            issuer,
            issuer + "/oauth/authorize",
            issuer + "/oauth/token",
            issuer + "/oauth/register",
            issuer + "/oauth/revoke",
            s_responseTypes,
            s_grantTypes,
            ["S256"],
            s_none,
            s_none,
            IssParameterSupported: true));
    }

    private static IResult Authorize(HttpRequest request)
    {
        var error = request.Query["response_type"].ToString() != "code" ? ErrorCodes.AgentResponseTypeInvalid
            : IsOtherResource(request, request.Query["resource"]) ? ErrorCodes.AgentResourceInvalid
            : null;
        return Results.Redirect("/connect" + (error is null ? request.QueryString : QueryString.Create("error", error)));
    }

    private static bool IsOtherResource(HttpRequest request, StringValues resources)
    {
        var own = Base(request);
        return resources.Any(r => r?.TrimEnd('/') is not { } resource || (resource != own && resource != own + McpPath));
    }

    private static IResult Register(RegistrationRequest request, AgentClients clients, IClusterState cluster, TimeProvider time)
    {
        try
        {
            var origins = AgentPolicy.TrustedOriginsOf(cluster.Current);
            var clientId = clients.Register(request.ClientName, request.RedirectUris, origins);
            var client = clients.Read(clientId, request.RedirectUris?[0], origins);
            return Results.Json(
                new RegistrationResponse(clientId, time.GetUtcNow().ToUnixTimeSeconds(), client.Name, client.RedirectUris, s_grantTypes, s_responseTypes, "none"),
                statusCode: StatusCodes.Status201Created);
        }
        catch (ActionFailedException)
        {
            return Results.Json(
                new ErrorResponse("invalid_redirect_uri", "Redirect URIs must point at this computer (localhost), or at an HTTPS origin an Apiary Administrator trusts on the Connected agents page."),
                statusCode: StatusCodes.Status400BadRequest);
        }
    }

    private static async Task<IResult> TokenAsync(HttpContext context, IMediator mediator)
    {
        if (!context.Request.HasFormContentType)
        {
            return Error(AgentTokenResult.InvalidRequest, StatusCodes.Status400BadRequest);
        }

        var form = await context.Request.ReadFormAsync(context.RequestAborted);
        if (IsOtherResource(context.Request, form["resource"]))
        {
            return Error("invalid_target", StatusCodes.Status400BadRequest);
        }

        var command = new IssueAgentToken(
            form["grant_type"].ToString(),
            Value(form, "client_id"),
            Value(form, "code"),
            Value(form, "code_verifier"),
            Value(form, "redirect_uri"),
            Value(form, "refresh_token"));
        var result = await mediator.SendAsync(command, context.RequestAborted);
        context.Response.Headers.CacheControl = "no-store";
        return result switch
        {
            { Error: AgentTokenResult.InvalidClient } => Error(AgentTokenResult.InvalidClient, StatusCodes.Status401Unauthorized),
            { Error: { } error } => Error(error, StatusCodes.Status400BadRequest),
            { AccessToken: { } access, RefreshToken: { } refresh } => Results.Json(new TokenResponse(access, "Bearer", result.ExpiresIn, refresh)),
            _ => Error("server_error", StatusCodes.Status500InternalServerError),
        };
    }

    private static async Task<IResult> RevokeAsync(HttpContext context, IMediator mediator)
    {
        if (!context.Request.HasFormContentType)
        {
            return Error(AgentTokenResult.InvalidRequest, StatusCodes.Status400BadRequest);
        }

        var form = await context.Request.ReadFormAsync(context.RequestAborted);
        if (Value(form, "token") is { } token)
        {
            await mediator.SendAsync(new RevokeAgentToken(token), context.RequestAborted);
        }

        return Results.Ok();
    }

    private static string? Value(IFormCollection form, string key) => form[key].ToString() is { Length: > 0 } value ? value : null;

    private static IResult Error(string error, int status) => Results.Json(new ErrorResponse(error), statusCode: status);

    private sealed record ResourceMetadataDocument(
        [property: JsonPropertyName("resource")] string Resource,
        [property: JsonPropertyName("authorization_servers")] IReadOnlyList<string> AuthorizationServers,
        [property: JsonPropertyName("bearer_methods_supported")] IReadOnlyList<string> BearerMethods,
        [property: JsonPropertyName("resource_name")] string ResourceName);

    private sealed record ServerMetadataDocument(
        [property: JsonPropertyName("issuer")] string Issuer,
        [property: JsonPropertyName("authorization_endpoint")] string AuthorizationEndpoint,
        [property: JsonPropertyName("token_endpoint")] string TokenEndpoint,
        [property: JsonPropertyName("registration_endpoint")] string RegistrationEndpoint,
        [property: JsonPropertyName("revocation_endpoint")] string RevocationEndpoint,
        [property: JsonPropertyName("response_types_supported")] IReadOnlyList<string> ResponseTypes,
        [property: JsonPropertyName("grant_types_supported")] IReadOnlyList<string> GrantTypes,
        [property: JsonPropertyName("code_challenge_methods_supported")] IReadOnlyList<string> CodeChallengeMethods,
        [property: JsonPropertyName("token_endpoint_auth_methods_supported")] IReadOnlyList<string> TokenAuthMethods,
        [property: JsonPropertyName("revocation_endpoint_auth_methods_supported")] IReadOnlyList<string> RevocationAuthMethods,
        [property: JsonPropertyName("authorization_response_iss_parameter_supported")] bool IssParameterSupported);

    private sealed record RegistrationRequest(
        [property: JsonPropertyName("client_name")] string? ClientName,
        [property: JsonPropertyName("redirect_uris")] IReadOnlyList<string>? RedirectUris);

    private sealed record RegistrationResponse(
        [property: JsonPropertyName("client_id")] string ClientId,
        [property: JsonPropertyName("client_id_issued_at")] long IssuedAt,
        [property: JsonPropertyName("client_name")] string ClientName,
        [property: JsonPropertyName("redirect_uris")] IReadOnlyList<string> RedirectUris,
        [property: JsonPropertyName("grant_types")] IReadOnlyList<string> GrantTypes,
        [property: JsonPropertyName("response_types")] IReadOnlyList<string> ResponseTypes,
        [property: JsonPropertyName("token_endpoint_auth_method")] string TokenAuthMethod);

    private sealed record TokenResponse(
        [property: JsonPropertyName("access_token")] string AccessToken,
        [property: JsonPropertyName("token_type")] string TokenType,
        [property: JsonPropertyName("expires_in")] int ExpiresIn,
        [property: JsonPropertyName("refresh_token")] string RefreshToken);

    private sealed record ErrorResponse(
        [property: JsonPropertyName("error")] string Error,
        [property: JsonPropertyName("error_description"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Description = null);
}
