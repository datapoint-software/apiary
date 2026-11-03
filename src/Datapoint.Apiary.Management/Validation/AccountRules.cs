using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Security.Passwords;
using FluentValidation;

namespace Datapoint.Apiary.Management.Validation;

public static class AccountRules
{
    public const int MaximumNameLength = 100;
    public const int MaximumEmailLength = 254;
    public const int MaximumCodeLength = 20;

    public static IRuleBuilderOptions<T, string> PersonName<T>(this IRuleBuilderInitial<T, string> rule) =>
        rule.Cascade(CascadeMode.Stop)
            .NotEmpty().WithErrorCode(ErrorCodes.Required)
            .MaximumLength(MaximumNameLength).WithErrorCode(ErrorCodes.TooLong);

    public static IRuleBuilderOptions<T, string> Email<T>(this IRuleBuilderInitial<T, string> rule) =>
        rule.Cascade(CascadeMode.Stop)
            .NotEmpty().WithErrorCode(ErrorCodes.Required)
            .MaximumLength(MaximumEmailLength).WithErrorCode(ErrorCodes.TooLong)
            .Must(IsEmail).WithErrorCode(ErrorCodes.EmailInvalid);

    public static IRuleBuilderOptions<T, string> NewPassword<T>(this IRuleBuilderInitial<T, string> rule, Func<T, string?> email, IBreachedPasswords breached) =>
        rule.Cascade(CascadeMode.Stop)
            .NotEmpty().WithErrorCode(ErrorCodes.Required)
            .MinimumLength(PasswordPolicy.MinimumLength).WithErrorCode(ErrorCodes.PasswordTooShort)
            .MaximumLength(PasswordPolicy.MaximumLength).WithErrorCode(ErrorCodes.PasswordTooLong)
            .Must(password => !CommonPasswords.IsCommon(password)).WithErrorCode(ErrorCodes.PasswordCommon)
            .Must((model, password) => PasswordPolicy.Check(password, email(model)) is not PasswordProblem.ContainsEmail)
            .WithErrorCode(ErrorCodes.PasswordContainsEmail)
            .MustAsync(async (password, ct) => !await breached.IsBreachedAsync(password, ct)).WithErrorCode(ErrorCodes.PasswordBreached);

    public static IRuleBuilderOptions<T, string> Code<T>(this IRuleBuilderInitial<T, string> rule) =>
        rule.Cascade(CascadeMode.Stop)
            .NotEmpty().WithErrorCode(ErrorCodes.Required)
            .MaximumLength(MaximumCodeLength).WithErrorCode(ErrorCodes.CodeInvalid);

    private static bool IsEmail(string email)
    {
        var trimmed = email.Trim();
        var at = trimmed.IndexOf('@', StringComparison.Ordinal);
        return at > 0
            && at == trimmed.LastIndexOf('@')
            && at < trimmed.Length - 1
            && !trimmed.Any(char.IsWhiteSpace)
            && !trimmed.Any(char.IsControl);
    }
}
