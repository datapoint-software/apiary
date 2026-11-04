using Datapoint.Apiary.Cluster.Routes;

namespace Datapoint.Apiary.Management.Routes;

public sealed record RoutePasswordView(DateTimeOffset SetAt, string? SetBy, int Days, string? Message, DateTimeOffset? LinkMadeAt)
{
    public static RoutePasswordView? From(RoutePassword? password) =>
        password is null ? null : new(password.SetAt, password.SetBy, password.Days, password.Message, password.Link?.MadeAt);
}
