using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Redirects;

public static class RedirectChanges
{
    public static IStateChange Saved(Redirect redirect) =>
        redirect.Path == Redirect.WholeHost ? new RedirectSaved(redirect) : new PathRedirectSaved(redirect);
}
