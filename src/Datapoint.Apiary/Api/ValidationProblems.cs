using System.Text;
using Datapoint.Apiary.Management.Errors;
using FluentValidation;
using FluentValidation.Results;

namespace Datapoint.Apiary.Api;

public static class ValidationProblems
{
    public const string ValidationFailed = "validation.failed";

    private static readonly Dictionary<string, string> s_parameterNames = new(StringComparer.Ordinal)
    {
        ["From"] = "min",
        ["To"] = "max",
        ["MinLength"] = "min",
        ["MaxLength"] = "max",
        ["ComparisonValue"] = "value",
    };

    public static ApiProblem From(ValidationException exception) =>
        new(StatusCodes.Status400BadRequest, ValidationFailed, [.. exception.Errors.Select(ToFieldError)]);

    private static FieldError ToFieldError(ValidationFailure failure) =>
        new(FieldName(failure.PropertyName), Code(failure.ErrorCode), Parameters(failure));

    private static string Code(string code) =>
        code.EndsWith("Validator", StringComparison.Ordinal) ? ErrorCodes.Invalid : code;

    private static Dictionary<string, object?>? Parameters(ValidationFailure failure)
    {
        if (failure.FormattedMessagePlaceholderValues is not { Count: > 0 } values)
        {
            return null;
        }

        var parameters = new Dictionary<string, object?>(StringComparer.Ordinal);
        foreach (var (key, value) in values)
        {
            if (!s_parameterNames.TryGetValue(key, out var name))
            {
                continue;
            }

            parameters[name] = value;
        }

        return parameters.Count > 0 ? parameters : null;
    }

    private static string FieldName(string propertyName)
    {
        var builder = new StringBuilder(propertyName.Length);
        var atSegmentStart = true;
        foreach (var character in propertyName)
        {
            builder.Append(atSegmentStart ? char.ToLowerInvariant(character) : character);
            atSegmentStart = character is '.' or ']';
        }

        return builder.ToString().Replace("].", "].", StringComparison.Ordinal);
    }
}
