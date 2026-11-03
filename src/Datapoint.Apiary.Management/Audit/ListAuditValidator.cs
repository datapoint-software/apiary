using Datapoint.Apiary.Management.Errors;
using FluentValidation;

namespace Datapoint.Apiary.Management.Audit;

public sealed class ListAuditValidator : AbstractValidator<ListAudit>
{
    public const int MaximumSearch = 200;

    public ListAuditValidator()
    {
        RuleFor(q => q.Via).IsInEnum().WithErrorCode(ErrorCodes.Invalid);
        RuleFor(q => q.Search).MaximumLength(MaximumSearch).WithErrorCode(ErrorCodes.TooLong);
    }
}
