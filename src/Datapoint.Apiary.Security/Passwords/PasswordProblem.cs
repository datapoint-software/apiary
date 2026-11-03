namespace Datapoint.Apiary.Security.Passwords;

public enum PasswordProblem
{
    None,
    TooShort,
    TooLong,
    Common,
    ContainsEmail,
}
