using Datapoint.Apiary.Cluster.SingleSignOn;
using Datapoint.Apiary.Cluster.Users;

namespace Datapoint.Apiary.Management.SingleSignOn;

public static class SsoRoles
{
    public static Role? Map(SsoSettings settings, IReadOnlyList<string> groups) =>
        groups.Intersect(settings.AdministratorGroups, StringComparer.Ordinal).Any() ? Role.Administrator
        : groups.Intersect(settings.OperatorGroups, StringComparer.Ordinal).Any() ? Role.Operator
        : groups.Intersect(settings.ViewerGroups, StringComparer.Ordinal).Any() ? Role.Viewer
        : null;
}
