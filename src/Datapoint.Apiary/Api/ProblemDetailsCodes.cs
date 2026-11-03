using Datapoint.Apiary.Management.Errors;

namespace Datapoint.Apiary.Api;

public static class ProblemDetailsCodes
{
    public static void Apply(ProblemDetailsContext context)
    {
        var problem = context.ProblemDetails;
        problem.Extensions["code"] = Code(problem.Status);
        problem.Title = null;
        problem.Detail = null;
        problem.Type = null;
        problem.Extensions.Remove("errors");
    }

    private static string Code(int? status) => status switch
    {
        StatusCodes.Status400BadRequest => ErrorCodes.InvalidRequest,
        StatusCodes.Status401Unauthorized => ErrorCodes.AuthenticationRequired,
        StatusCodes.Status403Forbidden => ErrorCodes.Forbidden,
        StatusCodes.Status404NotFound => "request.notFound",
        _ => ErrorCodes.Internal,
    };
}
