namespace Datapoint.Apiary.Cluster.Certificates;

public sealed record CertificateEvent(DateTimeOffset At, CertificateEventKind Kind, string? Code, string? Detail, string? By);
