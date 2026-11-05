using System.ComponentModel;

namespace Datapoint.Apiary.Management.Stacks;

public sealed record DeclaredRedirect(
    [property: Description("The redirect's name in its labels, such as www in apiary.redirect.www.from.")] string Name,
    [property: Description("The service in the stack file that declares it.")] string Service,
    [property: Description("The hostname to redirect, such as www.example.com.")] string From,
    [property: Description("The address to send visitors to, such as https://example.com, or, with a path, a path on the same hostname, such as /new.")] string To,
    [property: Description("The name of the project it belongs to, or null for the stack's project.")] string? Project = null,
    [property: Description("308, 307, 301 or 302. 308 when null.")] int? StatusCode = null,
    [property: Description("Whether to keep the rest of the path and the query. True when null.")] bool? KeepPath = null,
    [property: Description("The path to redirect, such as /old, or null for the whole hostname.")] string? Path = null);
