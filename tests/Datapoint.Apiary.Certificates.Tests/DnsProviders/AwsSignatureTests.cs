using Datapoint.Apiary.Certificates.DnsProviders;

namespace Datapoint.Apiary.Certificates.Tests.DnsProviders;

public sealed class AwsSignatureTests
{
    [Fact]
    public void A_request_is_signed_like_the_AWS_test_suite_s_get_vanilla()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "https://example.amazonaws.com/");

        AwsSignature.Sign(request, [], "AKIDEXAMPLE", "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY", "us-east-1", "service", new DateTimeOffset(2015, 8, 30, 12, 36, 0, TimeSpan.Zero));

        Assert.Equal(
            "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, SignedHeaders=host;x-amz-date, Signature=5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31",
            request.Headers.GetValues("Authorization").Single());
    }

    [Fact]
    public void Query_parameters_are_sorted_and_encoded()
    {
        Assert.Equal("dnsname=example.com&maxitems=10&name=_acme-challenge.shop.example.com&type=TXT", AwsSignature.CanonicalQuery("?type=TXT&name=_acme-challenge.shop.example.com&maxitems=10&dnsname=example.com"));
    }
}
