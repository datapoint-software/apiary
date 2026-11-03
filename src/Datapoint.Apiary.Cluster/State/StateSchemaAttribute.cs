namespace Datapoint.Apiary.Cluster.State;

[AttributeUsage(AttributeTargets.Class, Inherited = false)]
public sealed class StateSchemaAttribute(int version) : Attribute
{
    public int Version { get; } = version;
}
