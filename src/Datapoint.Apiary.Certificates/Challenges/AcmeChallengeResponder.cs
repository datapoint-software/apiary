using Datapoint.Apiary.Cluster.Raft;
using Microsoft.AspNetCore.Http;

namespace Datapoint.Apiary.Certificates.Challenges;

public sealed class AcmeChallengeResponder(RaftClusterState cluster)
{
    public const string PathPrefix = "/.well-known/acme-challenge";
    private const int MaximumTokenLength = 128;

    public static bool IsChallenge(HttpContext context) =>
        context.Request.Path.StartsWithSegments(PathPrefix, StringComparison.Ordinal);

    public async Task RespondAsync(HttpContext context)
    {
        context.Request.Path.StartsWithSegments(PathPrefix, StringComparison.Ordinal, out var rest);
        var token = rest.Value?.TrimStart('/') ?? "";
        var host = context.Request.Host.Host;
        if (!HttpMethods.IsGet(context.Request.Method)
            || !IsToken(token)
            || await cluster.FindChallengeAsync(token, context.RequestAborted) is not { } challenge
            || !string.Equals(challenge.Host, host, StringComparison.OrdinalIgnoreCase))
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }

        context.Response.ContentType = "application/octet-stream";
        await context.Response.WriteAsync(challenge.KeyAuthorization, context.RequestAborted);
    }

    private static bool IsToken(string token) =>
        token is { Length: > 0 and <= MaximumTokenLength } && token.All(c => char.IsAsciiLetterOrDigit(c) || c is '-' or '_');
}
