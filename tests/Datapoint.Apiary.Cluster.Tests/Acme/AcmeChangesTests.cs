using Datapoint.Apiary.Cluster.Acme;
using Datapoint.Apiary.Cluster.State;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Cluster.Tests.Acme;

public sealed class AcmeChangesTests
{
    [Fact]
    public void Saving_an_account_keys_it_by_its_directory()
    {
        var account = AnAcmeAccount();

        var state = ApiaryState.Empty.With(new AcmeAccountSaved(account));

        Assert.Same(account, state.AcmeAccounts[account.DirectoryUrl]);
    }

    [Fact]
    public void Accounts_for_different_directories_are_kept_apart()
    {
        var state = ApiaryState.Empty.With(
            new AcmeAccountSaved(AnAcmeAccount("https://acme-staging-v02.api.letsencrypt.org/directory")),
            new AcmeAccountSaved(AnAcmeAccount("https://acme-v02.api.letsencrypt.org/directory")));

        Assert.Equal(2, state.AcmeAccounts.Count);
    }

    [Fact]
    public void Adding_challenges_keys_them_by_token()
    {
        var challenge = AChallenge();

        var state = ApiaryState.Empty.With(new AcmeChallengesAdded([challenge]));

        Assert.Same(challenge, state.AcmeChallenges[challenge.Token]);
    }

    [Fact]
    public void Removing_challenges_removes_only_those_tokens()
    {
        var state = ApiaryState.Empty.With(
            new AcmeChallengesAdded([AChallenge("first"), AChallenge("second")]),
            new AcmeChallengesRemoved(["first"]));

        Assert.Equal(["second"], state.AcmeChallenges.Keys);
    }
}
