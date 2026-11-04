using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.State;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Cluster.Tests.Audit;

public sealed class AuditChangesTests
{
    [Fact]
    public void Recording_an_entry_appends_it_to_the_log()
    {
        var first = AnAuditEntry();
        var second = AnAuditEntry();

        var state = ApiaryState.Empty.With(new AuditRecorded(first), new AuditRecorded(second));

        Assert.Equal([first, second], state.Audit);
    }
}
