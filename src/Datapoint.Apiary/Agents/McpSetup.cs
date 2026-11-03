using System.Text.Json;
using Datapoint.Apiary.Api;
using Datapoint.Apiary.Auth;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Replication;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;
using FluentValidation;

namespace Datapoint.Apiary.Agents;

public static class McpSetup
{
    public const string Policy = "agents";

    public static IServiceCollection AddApiaryMcp(this IServiceCollection services)
    {
        services.AddAuthorizationBuilder().AddPolicy(Policy, policy => policy
            .AddAuthenticationSchemes(AuthenticationSchemes.Agent)
            .RequireAuthenticatedUser());
        services.AddMcpServer(o => o.ServerInstructions = Instructions)
            .WithHttpTransport(o => o.Stateless = true)
            .WithMediatorActions(o =>
            {
                o.SerializerOptions = ApiJson.Options;
                o.ErrorContent = Describe;
            });
        return services;
    }

    public static void MapApiaryMcp(this IEndpointRouteBuilder endpoints) =>
        endpoints.MapMcp(OAuthEndpoints.McpPath).RequireAuthorization(Policy);

    private const string Instructions =
        "Apiary is the reverse proxy in front of this Docker Swarm. You act for the user who connected you, with their role. "
        + "Before calling a tool that changes or deletes anything, show the user what you'll change and wait for their approval. "
        + "Errors come back as JSON with a code, such as route.notFound, its parameters and an English description, "
        + "and for invalid arguments the fields that failed with their own codes and descriptions. The codes are stable; the descriptions may change.";

    private static McpProblem? Describe(Exception exception) => exception switch
    {
        ValidationException validation => Content(ValidationProblems.From(validation)),
        InvalidActionArgumentsException { Field: { } field } invalid => Content(ValidationProblems.InvalidArgument(field, invalid.Reason)),
        InvalidActionArgumentsException => Content(new ApiProblem(0, ErrorCodes.InvalidRequest)),
        AuthenticationRequiredException => Content(new ApiProblem(0, ErrorCodes.AuthenticationRequired)),
        AccessDeniedException => Content(new ApiProblem(0, ErrorCodes.Forbidden)),
        ActionFailedException failed => Content(new ApiProblem(0, failed.Code, Params: failed.Params)),
        ForwardedProblemException forwarded => Content(Forwarded(forwarded.Body)),
        ClusterUnavailableException => Content(new ApiProblem(0, ErrorCodes.NoQuorum)),
        ClusterUpgradingException => Content(new ApiProblem(0, ErrorCodes.Upgrading)),
        _ => null,
    };

    private static ApiProblem Forwarded(string body)
    {
        try
        {
            return JsonSerializer.Deserialize<ApiProblem>(body, ApiJson.Options) ?? new ApiProblem(0, ErrorCodes.Internal);
        }
        catch (JsonException)
        {
            return new ApiProblem(0, ErrorCodes.Internal);
        }
    }

    private static McpProblem Content(ApiProblem problem) => new(
        problem.Code,
        McpErrorDescriptions.Describe(problem.Code, problem.Params),
        problem.Params,
        problem.Errors?.Select(e => new McpFieldProblem(e.Field, e.Code, McpErrorDescriptions.Describe(e.Code, e.Params), e.Params)).ToList());

    private sealed record McpProblem(string Code, string Description, IReadOnlyDictionary<string, object?>? Params, IReadOnlyList<McpFieldProblem>? Errors);

    private sealed record McpFieldProblem(string Field, string Code, string Description, IReadOnlyDictionary<string, object?>? Params);
}
