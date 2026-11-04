using Datapoint.Apiary.Security.Tokens;

namespace Datapoint.Apiary.Security.Tests.Tokens;

public sealed class RecoveryCodesTests
{
    [Fact]
    public void Ten_codes_are_made_at_a_time() =>
        Assert.Equal(10, RecoveryCodes.New().Count);

    [Fact]
    public void A_code_is_four_groups_of_four_unambiguous_characters() =>
        Assert.Matches("^[a-hjkmnp-z2-9]{4}(-[a-hjkmnp-z2-9]{4}){3}$", RecoveryCodes.New()[0]);

    [Fact]
    public void The_codes_differ_from_each_other() =>
        Assert.Equal(10, RecoveryCodes.New().Distinct(StringComparer.Ordinal).Count());

    [Fact]
    public void Normalizing_drops_separators_and_spaces_and_lowercases() =>
        Assert.Equal("abcd2345efgh6789", RecoveryCodes.Normalize(" ABCD-2345 efgh-6789 "));

    [Fact]
    public void A_code_typed_differently_hashes_the_same() =>
        Assert.Equal(RecoveryCodes.Hash("abcd-2345-efgh-6789"), RecoveryCodes.Hash("ABCD 2345 EFGH 6789"));

    [Fact]
    public void Different_codes_hash_differently() =>
        Assert.NotEqual(RecoveryCodes.Hash("abcd-2345-efgh-6789"), RecoveryCodes.Hash("abcd-2345-efgh-6788"));
}
