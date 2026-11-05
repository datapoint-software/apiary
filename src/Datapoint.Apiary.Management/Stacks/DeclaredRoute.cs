using System.ComponentModel;

namespace Datapoint.Apiary.Management.Stacks;

public sealed record DeclaredRoute(
    [property: Description("The route's name in its labels, such as web in apiary.route.web.host.")] string Name,
    [property: Description("The service in the stack file that declares it, such as web. The target is the Swarm service <stack>_<service>.")] string Service,
    [property: Description("The hostname, such as shop.example.com.")] string Host,
    [property: Description("The service's port.")] int Port,
    [property: Description("The path prefix, starting with /.")] string Path = "/",
    [property: Description("The name of the project the route belongs to, or null for the stack's project.")] string? Project = null,
    [property: Description("Seconds without any data moving, from 1 to 3600, or null to leave it as it is.")] int? TimeoutSeconds = null,
    [property: Description("Requests a minute from each client address, from 1 to 100000, or null to leave it as it is.")] int? RateLimit = null);
