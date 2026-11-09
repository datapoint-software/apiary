using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Validation;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Users;

public sealed class CheckEmailHandler(IClusterState cluster) : IQueryHandler<CheckEmail, IReadOnlyList<FieldCheck>>
{
    public ValueTask<IReadOnlyList<FieldCheck>> HandleAsync(CheckEmail query, CancellationToken cancellationToken = default) =>
        new(UserLookup.IsEmailTaken(cluster.Current, query.Email) ? [new FieldCheck("email", ErrorCodes.EmailTaken)] : []);
}
