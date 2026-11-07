using Datapoint.Apiary.Cluster.Recovery;

namespace Datapoint.Apiary.Testing.Builders;

public static class RecoveryBuilders
{
    public static RecoveryPlan ARecoveryPlan(long index = 10) =>
        new(
            Needed: true,
            Node: "node-a",
            Index: index,
            LastChangeAt: TestClock.Now,
            Survivors: [],
            Unreachable: ["node-b", "node-c"],
            Users: [new RecoveryUser("Ana", "ana@example.com", "Administrator", "Active")]);

    public static Survivor ASurvivor(long index, string node = "node-b", string address = "10.0.0.2", bool writable = false) => new(node, address, index, writable);
}
