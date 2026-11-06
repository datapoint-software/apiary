using Datapoint.Apiary.Certificates.Dns;

namespace Datapoint.Apiary.Certificates.Tests.Dns;

public sealed class DnsResponseTests
{
    [Fact]
    public void Reads_an_update_it_wrote()
    {
        var message = DnsMessages.Update(7, "example.com", "_acme-challenge.shop.example.com", "value", DnsUpdateKind.Remove);

        var update = Assert.Single(DnsResponse.Parse(message).Authorities);

        Assert.Equal(new DnsRecord("_acme-challenge.shop.example.com", DnsRecordType.Txt, DnsClass.None, 0, "value"), update);
    }

    [Fact]
    public void Follows_compressed_names()
    {
        var message = Convert.FromHexString("000181800001000100000000047368f70000010001c00c000500010000003c0002c00c".Replace("f7", "6f70", StringComparison.Ordinal));

        var answer = Assert.Single(DnsResponse.Parse(message).Answers);

        Assert.Equal(("shop", DnsRecordType.CName, "shop"), (answer.Name, answer.Type, answer.Data));
    }

    [Fact]
    public void Refuses_a_name_that_points_to_itself()
    {
        var message = Convert.FromHexString("000181800000000100000000c00c000100010000003c000401020304");

        var exception = Assert.Throws<DnsException>(() => DnsResponse.Parse(message));

        Assert.Equal(DnsErrors.Unreachable, exception.Code);
    }

    [Fact]
    public void Refuses_a_message_that_ends_early()
    {
        var message = Convert.FromHexString("0001818000010001");

        Assert.Throws<DnsException>(() => DnsResponse.Parse(message));
    }

    [Fact]
    public void Joins_long_text_split_into_strings()
    {
        var text = new string('a', 300);
        var message = new DnsWriter().TwoBytes(1).TwoBytes(0x8000).TwoBytes(0).TwoBytes(1).TwoBytes(0).TwoBytes(0)
            .Name("x.example.com").TwoBytes((int)DnsRecordType.Txt).TwoBytes(1).FourBytes(60).Data(new DnsWriter().CharacterStrings(text)).ToArray();

        Assert.Equal(text, Assert.Single(DnsResponse.Parse(message).Answers).Data);
    }
}
