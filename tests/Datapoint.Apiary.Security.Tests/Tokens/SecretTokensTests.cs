using Datapoint.Apiary.Security.Tokens;

namespace Datapoint.Apiary.Security.Tests.Tokens;

public sealed class SecretTokensTests
{
    [Fact]
    public void A_new_token_has_32_random_bytes() =>
        Assert.Equal(32, Base64Url.TryDecode(SecretTokens.New())?.Length);

    [Fact]
    public void Two_new_tokens_differ() =>
        Assert.NotEqual(SecretTokens.New(), SecretTokens.New());

    [Fact]
    public void Hashing_is_deterministic()
    {
        var token = SecretTokens.New();

        Assert.Equal(SecretTokens.Hash(token), SecretTokens.Hash(token));
    }

    [Fact]
    public void A_hash_is_SHA_256_in_base64url() =>
        Assert.Equal("LPJNul-wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ", SecretTokens.Hash("hello"));

    [Fact]
    public void Base64url_text_round_trips() =>
        Assert.Equal([0xFB, 0xFF, 0x01], Base64Url.TryDecode(Base64Url.Encode([0xFB, 0xFF, 0x01])));

    [Fact]
    public void Base64url_uses_no_plus_slash_or_padding() =>
        Assert.Equal("-_8", Base64Url.Encode([0xFB, 0xFF]));

    [Fact]
    public void Text_that_isn_t_base64url_doesn_t_decode() =>
        Assert.Null(Base64Url.TryDecode("not*base64"));
}
