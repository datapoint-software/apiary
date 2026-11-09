using Datapoint.Apiary.Cluster.Brands;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Brands;

public sealed class SaveBrandHandler(StateTransaction transaction, TimeProvider time, IPrincipalAccessor principals) : ICommandHandler<SaveBrand>
{
    public ValueTask HandleAsync(SaveBrand command, CancellationToken cancellationToken = default)
    {
        var contact = string.IsNullOrWhiteSpace(command.Contact) ? null : command.Contact.Trim();
        var brand = new VisitorBrand(
            command.Name.Trim(),
            command.Accent.Trim().ToUpperInvariant(),
            contact,
            BrandLogos.Parse(command.Logo, command.LogoName),
            time.GetUtcNow(),
            principals.Principal?.Identity?.Name);
        transaction.Record(new BrandSaved(command.ProjectId, brand));
        if (command.ProjectId is { } projectId)
        {
            transaction.Affects(projectId, projectId);
        }

        return ValueTask.CompletedTask;
    }
}
