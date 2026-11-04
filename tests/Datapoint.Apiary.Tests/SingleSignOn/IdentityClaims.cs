namespace Datapoint.Apiary.Tests.SingleSignOn;

internal static class IdentityClaims
{
    public static Dictionary<string, object?> APerson(string subject = "248289761001", string email = "rita@example.com") => new(StringComparer.Ordinal)
    {
        ["sub"] = subject,
        ["email"] = email,
        ["email_verified"] = true,
        ["name"] = "Rita Sousa",
        ["groups"] = new[] { "admins" },
    };

    public static Dictionary<string, object?> With(this Dictionary<string, object?> claims, string claim, object? value) =>
        new(claims, StringComparer.Ordinal) { [claim] = value };

    public static Dictionary<string, object?> Without(this Dictionary<string, object?> claims, string claim) =>
        claims.Where(c => c.Key != claim).ToDictionary(StringComparer.Ordinal);
}
