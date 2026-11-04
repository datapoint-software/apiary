using Datapoint.Apiary.Security.Passwords;

namespace Datapoint.Apiary.Security.Tests.Passwords;

public sealed class PasswordHasherTests
{
    private const string Password = "violet staple orbit 42";

    [Fact]
    public void The_right_password_verifies() =>
        Assert.True(PasswordHasher.Verify(Password, PasswordHasher.Hash(Password)));

    [Fact]
    public void A_wrong_password_doesn_t_verify() =>
        Assert.False(PasswordHasher.Verify("violet staple orbit 43", PasswordHasher.Hash(Password)));

    [Fact]
    public void Passwords_are_case_sensitive() =>
        Assert.False(PasswordHasher.Verify(Password.ToUpperInvariant(), PasswordHasher.Hash(Password)));

    [Fact]
    public void The_same_password_hashes_differently_each_time() =>
        Assert.NotEqual(PasswordHasher.Hash(Password), PasswordHasher.Hash(Password));

    [Fact]
    public void A_hash_names_its_algorithm_and_iterations() =>
        Assert.StartsWith("pbkdf2-sha512$210000$", PasswordHasher.Hash(Password), StringComparison.Ordinal);

    [Fact]
    public void A_hash_doesn_t_contain_the_password() =>
        Assert.DoesNotContain(Password, PasswordHasher.Hash(Password), StringComparison.Ordinal);

    [Fact]
    public void No_password_verifies_against_a_missing_hash() =>
        Assert.False(PasswordHasher.Verify("decoy password for unknown accounts", null));

    [Theory]
    [InlineData("")]
    [InlineData("plain")]
    [InlineData("bcrypt$10$salt$hash")]
    [InlineData("pbkdf2-sha512$210000$salt")]
    public void A_hash_in_another_format_doesn_t_verify(string stored) =>
        Assert.False(PasswordHasher.Verify(Password, stored));

    [Fact]
    public void A_hash_with_fewer_iterations_still_verifies() =>
        Assert.True(PasswordHasher.Verify(Password, WithIterations(PasswordHasher.Hash(Password), 1000)));

    [Fact]
    public void A_current_hash_doesn_t_need_rehashing() =>
        Assert.False(PasswordHasher.NeedsRehash(PasswordHasher.Hash(Password)));

    [Fact]
    public void A_hash_with_other_iterations_needs_rehashing() =>
        Assert.True(PasswordHasher.NeedsRehash("pbkdf2-sha512$100000$c2FsdA==$aGFzaA=="));

    private static string WithIterations(string stored, int iterations)
    {
        var parts = stored.Split('$');
        var salt = Convert.FromBase64String(parts[2]);
        var hash = System.Security.Cryptography.Rfc2898DeriveBytes.Pbkdf2(Password, salt, iterations, System.Security.Cryptography.HashAlgorithmName.SHA512, 64);
        return string.Join('$', parts[0], iterations.ToString(System.Globalization.CultureInfo.InvariantCulture), parts[2], Convert.ToBase64String(hash));
    }
}
