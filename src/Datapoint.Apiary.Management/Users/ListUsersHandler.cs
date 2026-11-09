using Datapoint.Apiary.Cluster.State;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Users;

public sealed class ListUsersHandler(IClusterState cluster) : IQueryHandler<ListUsers, IReadOnlyList<UserView>>
{
    public ValueTask<IReadOnlyList<UserView>> HandleAsync(ListUsers query, CancellationToken cancellationToken = default) =>
        new([.. cluster.Current.Users.Values.OrderBy(u => u.Name, StringComparer.CurrentCultureIgnoreCase).Select(UserView.From)]);
}
