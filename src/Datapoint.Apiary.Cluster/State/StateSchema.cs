using System.Collections.Concurrent;
using System.Reflection;

namespace Datapoint.Apiary.Cluster.State;

public static class StateSchema
{
    public const int Current = 1;
    private static readonly ConcurrentDictionary<Type, int> s_required = new();

    public static int Required(StateEntry entry) => entry.Changes.Select(c => Required(c.GetType())).DefaultIfEmpty(1).Max();

    public static int Supported(ApiaryState state) => state.Replicas.Values.Select(r => r.Schema ?? 1).DefaultIfEmpty(Current).Min();

    private static int Required(Type change) => s_required.GetOrAdd(change, t => t.GetCustomAttribute<StateSchemaAttribute>()?.Version ?? 1);
}
