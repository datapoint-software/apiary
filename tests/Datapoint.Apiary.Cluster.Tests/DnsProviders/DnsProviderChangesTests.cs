using Datapoint.Apiary.Cluster.Backups;
using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Cluster.DnsProviders;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Testing;
using Datapoint.Apiary.Testing.Builders;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Cluster.Tests.DnsProviders;

public sealed class DnsProviderChangesTests
{
    [Fact]
    public void Saving_a_provider_adds_it()
    {
        var provider = ADnsProvider();

        var state = ApiaryState.Empty.With(new DnsProviderSaved(provider));

        Assert.Equal(provider, state.DnsProviders[provider.Id]);
    }

    [Fact]
    public void Removing_a_provider_forgets_it()
    {
        var provider = ADnsProvider();

        var state = ApiaryState.Empty.With(new DnsProviderSaved(provider), new DnsProviderRemoved(provider.Id));

        Assert.Empty(state.DnsProviders);
    }

    [Fact]
    public void Challenge_records_are_kept_until_removed()
    {
        var record = new DnsChallengeRecord("_acme-challenge.shop.example.com", "value", "example.com", AnId(), TestClock.Now);
        var key = DnsChallengeRecord.KeyOf(record.Name, record.Value);

        var added = ApiaryState.Empty.With(new DnsChallengeRecordsAdded([record]));
        var removed = added.With(new DnsChallengeRecordsRemoved([key]));

        Assert.Equal(record, added.DnsChallengeRecords[key]);
        Assert.Empty(removed.DnsChallengeRecords);
    }

    [Fact]
    public void Changing_the_challenge_names_the_provider()
    {
        var certificate = ACertificate();
        var providerId = AnId();

        var state = ApiaryState.Empty.With(new CertificateSaved(certificate), new CertificateChallengeChanged(certificate.Id, providerId));

        Assert.Equal(providerId, state.Certificates[certificate.Id].DnsProviderId);
    }

    [Fact]
    public void A_requested_certificate_lists_every_name()
    {
        var certificate = ACertificate("*.example.com") with { AlternativeNames = ["example.com"], Requested = true };

        var state = ApiaryState.Empty.With(new CertificateRequested(certificate));

        Assert.Equal(["*.example.com", "example.com"], state.Certificates[certificate.Id].Names);
    }

    [Fact]
    public void Restoring_replaces_the_providers_but_keeps_the_records_to_clean_up()
    {
        var kept = ADnsProvider("example.org");
        var record = new DnsChallengeRecord("_acme-challenge.shop.example.com", "value", "example.com", AnId(), TestClock.Now);

        var restored = ApiaryState.Empty.With(new DnsProviderSaved(ADnsProvider()), new DnsChallengeRecordsAdded([record]), new StateRestored(ApiaryState.Empty.With(new DnsProviderSaved(kept))));

        Assert.Equal(kept, Assert.Single(restored.DnsProviders).Value);
        Assert.Single(restored.DnsChallengeRecords);
    }

    [Fact]
    public void DNS_challenges_need_every_replica_on_the_fifth_schema() =>
        Assert.Equal(5, StateSchema.Required(AnEntry(new DnsProviderSaved(ADnsProvider()), new CertificateRequested(ACertificate()))));
}
