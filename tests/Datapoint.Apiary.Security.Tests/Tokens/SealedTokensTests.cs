using System.Text;
using Datapoint.Apiary.Security.Tokens;

namespace Datapoint.Apiary.Security.Tests.Tokens;

public sealed class SealedTokensTests
{
    private static readonly byte[] s_payload = Encoding.UTF8.GetBytes("{\"user\":\"ana@example.com\"}");

    private readonly SealedTokens _tokens = new(SealingKey.Generate());

    [Fact]
    public void A_sealed_payload_opens_with_the_same_key_and_purpose() =>
        Assert.Equal(s_payload, _tokens.Open("sign-in", _tokens.Seal("sign-in", s_payload)));

    [Fact]
    public void A_token_doesn_t_open_for_another_purpose() =>
        Assert.Null(_tokens.Open("invite", _tokens.Seal("sign-in", s_payload)));

    [Fact]
    public void A_token_doesn_t_open_with_another_key() =>
        Assert.Null(new SealedTokens(SealingKey.Generate()).Open("sign-in", _tokens.Seal("sign-in", s_payload)));

    [Fact]
    public void A_tampered_token_doesn_t_open()
    {
        var token = _tokens.Seal("sign-in", s_payload).ToCharArray();
        token[^3] = token[^3] == 'A' ? 'B' : 'A';

        Assert.Null(_tokens.Open("sign-in", new string(token)));
    }

    [Fact]
    public void Sealing_twice_gives_different_tokens() =>
        Assert.NotEqual(_tokens.Seal("sign-in", s_payload), _tokens.Seal("sign-in", s_payload));

    [Fact]
    public void A_token_doesn_t_reveal_its_payload() =>
        Assert.DoesNotContain("ana", _tokens.Seal("sign-in", s_payload), StringComparison.OrdinalIgnoreCase);

    [Theory]
    [InlineData("")]
    [InlineData("not a token")]
    [InlineData("AAAA")]
    [InlineData("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")]
    public void Something_that_isn_t_a_token_doesn_t_open(string token) =>
        Assert.Null(_tokens.Open("sign-in", token));

    [Fact]
    public void A_sealing_key_must_have_32_bytes() =>
        Assert.Throws<ArgumentOutOfRangeException>(() => new SealingKey(new byte[16]));
}
