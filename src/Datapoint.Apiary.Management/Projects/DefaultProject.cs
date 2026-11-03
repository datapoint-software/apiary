using Datapoint.Apiary.Cluster.Projects;
using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Management.Projects;

public static class DefaultProject
{
    public static async ValueTask EnsureAsync(IClusterState cluster, TimeProvider time, CancellationToken cancellationToken)
    {
        if (!cluster.Current.Projects.IsEmpty || !cluster.IsWritable)
        {
            return;
        }

        var now = time.GetUtcNow();
        var project = new Project(Guid.CreateVersion7(now), "Default", "Routes that don't belong to another project yet.", "folder");
        await cluster.AppendAsync(new StateEntry(Guid.CreateVersion7(now), now, [new ProjectSaved(project)]), cancellationToken);
    }
}
