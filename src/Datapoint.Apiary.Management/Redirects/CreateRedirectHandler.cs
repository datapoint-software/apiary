using Datapoint.Apiary.Cluster.Redirects;
using Datapoint.Apiary.Management.Routes;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Redirects;

public sealed class CreateRedirectHandler(StateTransaction transaction, TimeProvider time, IPrincipalAccessor principals)
    : ICommandHandler<CreateRedirect, Guid>
{
    public ValueTask<Guid> HandleAsync(CreateRedirect command, CancellationToken ct = default)
    {
        var now = time.GetUtcNow();
        var redirect = new Redirect(
            Guid.CreateVersion7(now),
            command.ProjectId,
            RouteNormalization.Host(command.From),
            command.To.Trim(),
            command.StatusCode,
            command.KeepPath,
            now,
            principals.Principal?.Identity?.Name);
        transaction.Record(new RedirectSaved(redirect));
        transaction.Affects(redirect.Id, redirect.ProjectId);
        return new(redirect.Id);
    }
}
