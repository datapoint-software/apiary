using Datapoint.Apiary.Security.Keys;

namespace Datapoint.Apiary.Security.Tests.Keys;

public sealed class RootKeyTests
{
    [Fact]
    public void A_formatted_key_parses_back_to_the_same_key()
    {
        var key = RootKey.Generate();

        var parsed = RootKey.TryParse(key.Format());

        Assert.Equal(key.Id, parsed?.Id);
    }

    [Fact]
    public void Parsing_ignores_surrounding_whitespace()
    {
        var key = RootKey.Generate();

        var parsed = RootKey.TryParse($"  {key.Format()}\n");

        Assert.Equal(key.Id, parsed?.Id);
    }

    [Fact]
    public void A_formatted_key_starts_with_its_version_prefix() =>
        Assert.StartsWith("apiary-root-key-1:", RootKey.Generate().Format(), StringComparison.Ordinal);

    [Theory]
    [InlineData("")]
    [InlineData("apiary-root-key-1:")]
    [InlineData("apiary-root-key-2:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")]
    [InlineData("apiary-root-key-1:AAAA")]
    [InlineData("apiary-root-key-1:not base64!")]
    [InlineData("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")]
    public void Text_that_isn_t_a_root_key_doesn_t_parse(string text) =>
        Assert.Null(RootKey.TryParse(text));

    [Fact]
    public void Two_generated_keys_differ() =>
        Assert.NotEqual(RootKey.Generate().Id, RootKey.Generate().Id);

    [Fact]
    public void Derivation_is_deterministic_for_one_key_and_purpose()
    {
        var key = RootKey.Generate();

        Assert.Equal(key.Derive(KeyPurposes.StateAtRest), key.Derive(KeyPurposes.StateAtRest));
    }

    [Fact]
    public void Each_purpose_derives_a_different_key()
    {
        var key = RootKey.Generate();

        Assert.NotEqual(key.Derive(KeyPurposes.StateAtRest), key.Derive(KeyPurposes.Backups));
    }

    [Fact]
    public void A_derived_key_has_32_bytes_by_default() =>
        Assert.Equal(32, RootKey.Generate().Derive(KeyPurposes.Join).Length);

    [Fact]
    public void A_derived_key_has_the_length_asked_for() =>
        Assert.Equal(16, RootKey.Generate().Derive(KeyPurposes.Join, 16).Length);

    [Fact]
    public void The_id_reveals_nothing_of_the_key() =>
        Assert.DoesNotContain(RootKey.Generate().Id, RootKey.Generate().Format(), StringComparison.Ordinal);

    [Fact]
    public void The_id_is_12_characters() =>
        Assert.Equal(12, RootKey.Generate().Id.Length);
}
