using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Acme;

public sealed record AcmeAccountSaved(AcmeAccount Account) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) =>
        state with { AcmeAccounts = state.AcmeAccounts.SetItem(Account.DirectoryUrl, Account) };
}
