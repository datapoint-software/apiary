using FluentValidation;
using FluentValidation.Results;

namespace Datapoint.Apiary.Management.Errors;

public static class FieldErrors
{
    public static ValidationException For(string property, string code) =>
        new([new ValidationFailure(property, code) { ErrorCode = code }]);
}
