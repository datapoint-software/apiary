using System.Text.Json;
using System.Text.Json.Serialization;
using Datapoint.Apiary.Api;

namespace Datapoint.Apiary.Replication;

public static class ForwardingJson
{
    public static JsonSerializerOptions Options { get; } = Create();

    private static JsonSerializerOptions Create()
    {
        var options = new JsonSerializerOptions(ApiJson.Options) { DefaultIgnoreCondition = JsonIgnoreCondition.Never };
        options.MakeReadOnly();
        return options;
    }
}
