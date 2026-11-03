using Datapoint.Apiary.Cluster.Raft;
using Microsoft.AspNetCore.Http;

namespace Datapoint.Apiary.Certificates.Challenges;

public sealed class AcmeChallengeResponder(RaftClusterState cluster)
{
    public const string PathPrefix = "/.well-known/acme-challenge/";

    public static bool IsChallenge(HttpContext context) =>
        context.Request.Path.StartsWithSegments(PathPrefix.TrimEnd('/'), StringComparison.Ordinal);

    public async Task RespondAsync(HttpContext context)
    {
        var token = context.Request.Path.Value![PathPrefix.Length..];
        var host = context.Request.Host.Host;
        if (!HttpMethods.IsGet(context.Request.Method)
            || await cluster.FindChallengeAsync(token, context.RequestAborted) is not { } challenge
            || !string.Equals(challenge.Host, host, StringComparison.OrdinalIgnoreCase))
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }

        context.Response.ContentType = "application/octet-stream";
        await context.Response.WriteAsync(challenge.KeyAuthorization, context.RequestAborted);
    }
}
