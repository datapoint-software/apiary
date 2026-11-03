using System.Text.Json;
using Datapoint.Apiary.Api;
using Datapoint.Apiary.Auth;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Replication;
using Datapoint.Mediator.Authorization;
using FluentValidation;

namespace Datapoint.Apiary.Agents;

public static class McpSetup
{
    public const string Policy = "agents";

    private static readonly string[] s_withheldPrefixes = ["auth.", "account.", "setup.", "invites.", "oauth.", "sso."];
    private static readonly HashSet<string> s_withheld = new(StringComparer.Ordinal)
    {
        "certificates.upload",
        "certificates.check",
        "backups.export",
        "backups.restore",
        "agents.connect",
        "agents.client",
    };

    public static IServiceCollection AddApiaryMcp(this IServiceCollection services)
    {
        services.AddAuthorizationBuilder().AddPolicy(Policy, policy => policy
            .AddAuthenticationSchemes(AuthenticationSchemes.Agent)
            .RequireAuthenticatedUser());
        services.AddMcpServer(o => o.ServerInstructions = Instructions)
            .WithHttpTransport(o => o.Stateless = true)
            .WithMediatorActions(o =>
            {
                o.Filter = action => IsOffered(action.Name);
                o.SerializerOptions = ApiJson.Options;
                o.ErrorMessage = Describe;
            });
        return services;
    }

    public static void MapApiaryMcp(this IEndpointRouteBuilder endpoints) =>
        endpoints.MapMcp(OAuthEndpoints.McpPath).RequireAuthorization(Policy);

    public static bool IsOffered(string action) =>
        !s_withheld.Contains(action) && !s_withheldPrefixes.Any(prefix => action.StartsWith(prefix, StringComparison.Ordinal));

    private const string Instructions =
        "Apiary is the reverse proxy in front of this Docker Swarm. You act for the user who connected you, with their role. "
        + "Before calling a tool that changes or deletes anything, show the user what you'll change and wait for their approval. "
        + "Errors come back as JSON with a code, such as route.notFound, and the fields that failed validation.";

    private static string? Describe(Exception exception) => exception switch
    {
        ValidationException validation => Json(ValidationProblems.From(validation)),
        ActionFailedException failed => Json(new ApiProblem(0, failed.Code, Params: failed.Params)),
        AccessDeniedException => Json(new ApiProblem(0, ErrorCodes.Forbidden)),
        ForwardedProblemException forwarded => forwarded.Body,
        ClusterUnavailableException => Json(new ApiProblem(0, ErrorCodes.NoQuorum)),
        ClusterUpgradingException => Json(new ApiProblem(0, ErrorCodes.Upgrading)),
        _ => null,
    };

    private static string Json(ApiProblem problem) => JsonSerializer.Serialize(new { problem.Code, problem.Errors, problem.Params }, ApiJson.Options);
}
