using Datapoint.Apiary.Cluster.Streams;
using Datapoint.Apiary.Management.Routes;

namespace Datapoint.Apiary.Management.Streams;

public static class StreamNormalization
{
    public static IReadOnlyList<string> ServerNames(IStreamFields fields) =>
        fields.Protocol is StreamProtocol.Udp
            ? []
            : [.. (fields.ServerNames ?? []).Select(n => n.Trim().ToLowerInvariant()).Where(n => n.Length > 0).Distinct(StringComparer.Ordinal)];

    public static StreamRoute Apply(StreamRoute stream, IStreamFields fields) => stream with
    {
        ProjectId = fields.ProjectId,
        Name = fields.Name.Trim(),
        Protocol = fields.Protocol,
        ListenPort = fields.ListenPort,
        TargetHost = fields.TargetHost.Trim().ToLowerInvariant(),
        TargetPort = fields.TargetPort,
        ServerNames = ServerNames(fields),
        IdleTimeoutSeconds = fields.Protocol is StreamProtocol.Udp ? fields.IdleTimeoutSeconds : StreamRules.DefaultIdleTimeoutSeconds,
        AllowedAddresses = RouteNormalization.Addresses(fields.AllowedAddresses),
    };
}
