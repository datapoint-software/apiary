using System.Diagnostics;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Replication;
using FluentValidation;

namespace Datapoint.Apiary.Api;

public static class ApiErrors
{
    public static IResult? Map(Exception exception) => exception switch
    {
        ValidationException validation => ValidationProblems.From(validation).ToResult(),
        ActionFailedException failed => new ApiProblem(Status(failed.Kind), failed.Code, Params: failed.Params).ToResult(),
        ForwardedProblemException forwarded => forwarded.ToResult(),
        ClusterUnavailableException => new ApiProblem(StatusCodes.Status503ServiceUnavailable, ErrorCodes.NoQuorum).ToResult(),
        _ => null,
    };

    public static ApiProblem Internal(HttpContext context) =>
        new(StatusCodes.Status500InternalServerError, ErrorCodes.Internal, TraceId: Activity.Current?.Id ?? context.TraceIdentifier);

    private static int Status(FailureKind kind) => kind switch
    {
        FailureKind.NotFound => StatusCodes.Status404NotFound,
        FailureKind.Forbidden => StatusCodes.Status403Forbidden,
        FailureKind.Unavailable => StatusCodes.Status503ServiceUnavailable,
        FailureKind.Throttled => StatusCodes.Status429TooManyRequests,
        FailureKind.Invalid => StatusCodes.Status400BadRequest,
        _ => StatusCodes.Status409Conflict,
    };
}
