using Datapoint.Apiary.Management.Errors;
using FluentValidation;

namespace Datapoint.Apiary.Management.Account;

public sealed class SetLanguageValidator : AbstractValidator<SetLanguage>
{
    public static readonly IReadOnlyList<string> Supported = ["en", "pt-PT"];

    public SetLanguageValidator() =>
        RuleFor(x => x.Language).Must(language => Supported.Contains(language, StringComparer.Ordinal)).WithErrorCode(ErrorCodes.LanguageUnsupported);
}
