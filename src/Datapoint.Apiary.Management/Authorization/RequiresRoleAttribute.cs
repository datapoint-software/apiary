using Datapoint.Apiary.Cluster.Users;

namespace Datapoint.Apiary.Management.Authorization;

[AttributeUsage(AttributeTargets.Class, Inherited = false)]
public sealed class RequiresRoleAttribute(Role role) : Attribute
{
    public Role Role { get; } = role;
}
