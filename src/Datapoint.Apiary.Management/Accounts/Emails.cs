namespace Datapoint.Apiary.Management.Accounts;

public static class Emails
{
    public static string Normalize(string email) => email.Trim().ToLowerInvariant();
}
