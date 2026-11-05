using Datapoint.Apiary.Management.Stacks;

namespace Datapoint.Apiary.Stacks;

public sealed record StackFile(
    int Services,
    int Labels,
    IReadOnlyList<DeclaredRoute> Routes,
    IReadOnlyList<DeclaredStreamRoute> StreamRoutes,
    IReadOnlyList<DeclaredRedirect> Redirects,
    IReadOnlyList<string> Errors);
