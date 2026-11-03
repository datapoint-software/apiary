namespace Datapoint.Apiary.Management.Projects;

public sealed record ProjectView(Guid Id, string Name, string Description, string Icon, int RouteCount);
