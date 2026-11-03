using Datapoint.Apiary.Cluster.Certificates;

namespace Datapoint.Apiary.Certificates.Renewal;

public sealed record IssueResult(Certificate Certificate, string? FailureCode, string? FailureDetail)
{
    public bool Succeeded => FailureCode is null;
}
