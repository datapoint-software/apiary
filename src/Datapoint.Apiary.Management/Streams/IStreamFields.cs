using Datapoint.Apiary.Cluster.Streams;

namespace Datapoint.Apiary.Management.Streams;

public interface IStreamFields
{
    Guid ProjectId { get; }

    string Name { get; }

    StreamProtocol Protocol { get; }

    int ListenPort { get; }

    string TargetHost { get; }

    int TargetPort { get; }

    IReadOnlyList<string>? ServerNames { get; }

    int IdleTimeoutSeconds { get; }
}
