namespace Datapoint.Apiary.Security.Passwords;

public static class PasswordPolicy
{
    public const int MinimumLength = 15;
    public const int MaximumLength = 256;

    public static PasswordProblem Check(string password, string? email)
    {
        if (password.Length < MinimumLength)
        {
            return PasswordProblem.TooShort;
        }

        if (password.Length > MaximumLength)
        {
            return PasswordProblem.TooLong;
        }

        if (CommonPasswords.IsCommon(password))
        {
            return PasswordProblem.Common;
        }

        return ContainsEmailName(password, email) ? PasswordProblem.ContainsEmail : PasswordProblem.None;
    }

    private static bool ContainsEmailName(string password, string? email)
    {
        var name = email?.Split('@')[0] ?? "";
        return name.Length >= 3 && password.Contains(name, StringComparison.OrdinalIgnoreCase);
    }
}
