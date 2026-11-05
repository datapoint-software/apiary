using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Cluster.Projects;
using Datapoint.Apiary.Cluster.Redirects;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.Streams;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Projects;

public sealed class DeleteProjectHandler(StateTransaction transaction) : ICommandHandler<DeleteProject>
{
    public ValueTask HandleAsync(DeleteProject command, CancellationToken ct = default)
    {
        var state = transaction.State;
        if (!state.Projects.ContainsKey(command.Id))
        {
            throw ActionFailedException.NotFound(ErrorCodes.ProjectNotFound);
        }

        if (state.Projects.Count == 1)
        {
            throw ActionFailedException.Conflict(ErrorCodes.ProjectLast);
        }

        var routes = state.Routes.Values.Where(r => r.ProjectId == command.Id).ToList();
        var redirects = state.Redirects.Values.Where(r => r.ProjectId == command.Id).ToList();
        var certificates = state.Certificates.Values.Where(c => c.ProjectId == command.Id).ToList();
        var streams = state.StreamRoutes.Values.Where(s => s.ProjectId == command.Id).ToList();
        if (routes.Count + redirects.Count + certificates.Count + streams.Count > 0)
        {
            var moveTo = MoveTarget(command);
            routes.ForEach(r => transaction.Record(new RouteSaved(r with { ProjectId = moveTo })));
            redirects.ForEach(r => transaction.Record(RedirectChanges.Saved(r with { ProjectId = moveTo })));
            certificates.ForEach(c => transaction.Record(new CertificateSaved(c with { ProjectId = moveTo })));
            streams.ForEach(s => transaction.Record(new StreamRouteSaved(s with { ProjectId = moveTo })));
        }

        transaction.Record(new ProjectDeleted(command.Id));
        transaction.Affects(command.Id, command.Id);
        return ValueTask.CompletedTask;
    }

    private Guid MoveTarget(DeleteProject command)
    {
        if (command.MoveTo is not { } moveTo)
        {
            throw ActionFailedException.Conflict(ErrorCodes.ProjectNotEmpty);
        }

        if (moveTo == command.Id)
        {
            throw ActionFailedException.Invalid(ErrorCodes.ProjectMoveToSelf);
        }

        return transaction.State.Projects.ContainsKey(moveTo)
            ? moveTo
            : throw ActionFailedException.NotFound(ErrorCodes.ProjectNotFound);
    }
}
