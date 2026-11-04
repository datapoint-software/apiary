using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Routes;

public sealed record RouteDefaults(int RequestMegabytes)
{
    public const int DefaultRequestMegabytes = 30;
    public const long BytesPerMegabyte = 1_000_000;

    public static int RequestMegabytesOf(ApiaryState state) => state.RouteDefaults?.RequestMegabytes ?? DefaultRequestMegabytes;

    public static long? MaxRequestBodySize(ApiaryState state, Route route) => route.RequestSize switch
    {
        RequestSizeLimit.Unlimited => null,
        RequestSizeLimit.Custom when route.RequestMegabytes is { } megabytes => megabytes * BytesPerMegabyte,
        _ => RequestMegabytesOf(state) * BytesPerMegabyte,
    };
}
