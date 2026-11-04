using System.Text;
using Datapoint.Apiary.Security.TwoStep;

namespace Datapoint.Apiary.Security.Tests.TwoStep;

public sealed class TotpTests
{
    private static readonly byte[] s_rfcKey = Encoding.ASCII.GetBytes("12345678901234567890");
    private static readonly string s_rfcSecret = Base32.Encode(s_rfcKey);
    private static readonly DateTimeOffset s_now = DateTimeOffset.FromUnixTimeSeconds(1_111_111_109);

    [Theory]
    [InlineData(59, "287082")]
    [InlineData(1_111_111_109, "081804")]
    [InlineData(1_111_111_111, "050471")]
    [InlineData(1_234_567_890, "005924")]
    [InlineData(2_000_000_000, "279037")]
    [InlineData(20_000_000_000, "353130")]
    public void Codes_match_the_RFC_6238_test_vectors(long seconds, string code) =>
        Assert.Equal(code, Totp.Compute(s_rfcKey, Totp.Step(DateTimeOffset.FromUnixTimeSeconds(seconds))));

    [Fact]
    public void The_current_code_verifies_and_returns_its_step() =>
        Assert.Equal(Totp.Step(s_now), Totp.Verify(s_rfcSecret, "081804", s_now, lastUsedStep: 0));

    [Fact]
    public void A_code_typed_with_spaces_verifies() =>
        Assert.NotNull(Totp.Verify(s_rfcSecret, "081 804", s_now, lastUsedStep: 0));

    [Fact]
    public void The_previous_period_s_code_still_verifies() =>
        Assert.NotNull(Totp.Verify(s_rfcSecret, CodeAt(s_now.AddSeconds(-30)), s_now, lastUsedStep: 0));

    [Fact]
    public void The_next_period_s_code_verifies() =>
        Assert.NotNull(Totp.Verify(s_rfcSecret, CodeAt(s_now.AddSeconds(30)), s_now, lastUsedStep: 0));

    [Fact]
    public void A_code_two_periods_old_doesn_t_verify() =>
        Assert.Null(Totp.Verify(s_rfcSecret, CodeAt(s_now.AddSeconds(-60)), s_now, lastUsedStep: 0));

    [Fact]
    public void A_code_can_t_be_used_twice() =>
        Assert.Null(Totp.Verify(s_rfcSecret, "081804", s_now, lastUsedStep: Totp.Step(s_now)));

    [Fact]
    public void An_older_code_can_t_be_used_after_a_newer_one() =>
        Assert.Null(Totp.Verify(s_rfcSecret, CodeAt(s_now.AddSeconds(-30)), s_now, lastUsedStep: Totp.Step(s_now)));

    [Theory]
    [InlineData("")]
    [InlineData("08180")]
    [InlineData("0818045")]
    [InlineData("abcdef")]
    public void A_code_without_six_digits_doesn_t_verify(string code) =>
        Assert.Null(Totp.Verify(s_rfcSecret, code, s_now, lastUsedStep: 0));

    [Fact]
    public void A_wrong_code_doesn_t_verify() =>
        Assert.Null(Totp.Verify(s_rfcSecret, "123456", s_now, lastUsedStep: 0));

    [Fact]
    public void A_new_secret_is_20_bytes_in_base32() =>
        Assert.Matches("^[A-Z2-7]{32}$", Totp.NewSecret());

    [Fact]
    public void The_setup_uri_names_the_issuer_account_and_settings() =>
        Assert.Equal(
            "otpauth://totp/Apiary%20prod:ana%40example.com?secret=GEZDGNBV&issuer=Apiary%20prod&algorithm=SHA1&digits=6&period=30",
            Totp.Uri("GEZDGNBV", "ana@example.com", "Apiary prod"));

    [Fact]
    public void Base32_round_trips_bytes() =>
        Assert.Equal(s_rfcKey, Base32.Decode(Base32.Encode(s_rfcKey)));

    [Fact]
    public void Base32_matches_the_RFC_4648_example() =>
        Assert.Equal("MZXW6YTBOI", Base32.Encode("foobar"u8));

    [Fact]
    public void Base32_decoding_ignores_case_spaces_and_padding() =>
        Assert.Equal("foobar"u8.ToArray(), Base32.Decode("mzxw 6ytb oi======"));

    private static string CodeAt(DateTimeOffset at) => Totp.Compute(s_rfcKey, Totp.Step(at));
}
