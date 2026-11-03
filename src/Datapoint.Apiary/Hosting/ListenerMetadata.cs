namespace Datapoint.Apiary.Hosting;

public sealed record ListenerMetadata(ListenerKind Kind)
{
    public static ListenerMetadata Public { get; } = new(ListenerKind.Public);

    public static ListenerMetadata Admin { get; } = new(ListenerKind.Admin);
}
