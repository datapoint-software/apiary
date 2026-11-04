using Datapoint.Apiary.Security.Passwords;

namespace Datapoint.Apiary.Security.Tests.Passwords;

public sealed class PasswordPolicyTests
{
    [Fact]
    public void A_long_uncommon_password_is_accepted() =>
        Assert.Equal(PasswordProblem.None, PasswordPolicy.Check("violet staple orbit 42", "ana@example.com"));

    [Fact]
    public void A_password_of_exactly_15_characters_is_long_enough() =>
        Assert.Equal(PasswordProblem.None, PasswordPolicy.Check("violet-staple-9", null));

    [Fact]
    public void A_password_under_15_characters_is_too_short() =>
        Assert.Equal(PasswordProblem.TooShort, PasswordPolicy.Check("violet-staple9", null));

    [Fact]
    public void A_password_of_256_characters_is_accepted() =>
        Assert.Equal(PasswordProblem.None, PasswordPolicy.Check(LongPassword(256), null));

    [Fact]
    public void A_password_over_256_characters_is_too_long() =>
        Assert.Equal(PasswordProblem.TooLong, PasswordPolicy.Check(LongPassword(257), null));

    [Theory]
    [InlineData("passwordpassword")]
    [InlineData("PasswordPassword")]
    [InlineData("correcthorsebatterystaple")]
    [InlineData("aaaaaaaaaaaaaaaa")]
    [InlineData("abababababababab")]
    [InlineData("abcdabcdabcdabcd")]
    [InlineData("abcdefghijklmnop")]
    [InlineData("ponmlkjihgfedcba")]
    [InlineData("qwertyuiopasdfgh")]
    [InlineData("1234567890123456")]
    [InlineData("1111122222333331")]
    [InlineData("xyzabcdefghijklm")]
    public void A_common_or_predictable_password_is_refused(string password) =>
        Assert.Equal(PasswordProblem.Common, PasswordPolicy.Check(password, null));

    [Fact]
    public void A_password_from_the_embedded_list_is_refused() =>
        Assert.Equal(PasswordProblem.Common, PasswordPolicy.Check("1qaz2wsx3edc4rfv", null));

    [Fact]
    public void A_password_containing_the_email_s_name_is_refused() =>
        Assert.Equal(PasswordProblem.ContainsEmail, PasswordPolicy.Check("my name is Joana Silva!", "joana@example.com"));

    [Fact]
    public void A_short_email_name_isn_t_checked() =>
        Assert.Equal(PasswordProblem.None, PasswordPolicy.Check("violet staple orbit jo", "jo@example.com"));

    private static string LongPassword(int length) =>
        string.Concat(Enumerable.Range(0, length).Select(index => (char)('a' + (index * 7 % 26))));
}
