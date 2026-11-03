using Microsoft.AspNetCore.Routing.Matching;

namespace Datapoint.Apiary.Hosting;

public sealed class ListenerMatcherPolicy : MatcherPolicy, IEndpointSelectorPolicy
{
    public override int Order => -1000;

    public bool AppliesToEndpoints(IReadOnlyList<Endpoint> endpoints) => endpoints.Count > 0;

    public Task ApplyAsync(HttpContext httpContext, CandidateSet candidates)
    {
        var kind = Listener.Kind(httpContext);
        for (var i = 0; i < candidates.Count; i++)
        {
            var listener = candidates[i].Endpoint.Metadata.GetMetadata<ListenerMetadata>();
            candidates.SetValidity(i, listener?.Kind == kind);
        }

        return Task.CompletedTask;
    }
}
