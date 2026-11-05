using YamlDotNet.Core;
using YamlDotNet.RepresentationModel;

namespace Datapoint.Apiary.Stacks;

public static class StackFileReader
{
    public static StackFile Read(TextReader text, Func<string, string?> environment)
    {
        var yaml = new YamlStream();
        try
        {
            yaml.Load(text);
        }
        catch (YamlException exception)
        {
            return Failed($"The stack file isn't valid YAML: line {exception.Start.Line}, column {exception.Start.Column}.");
        }

        if (yaml.Documents is not [{ RootNode: YamlMappingNode root }])
        {
            return Failed("The stack file must be one YAML document with a services section.");
        }

        if (Child(root, "services") is not YamlMappingNode services)
        {
            return Failed("The stack file has no services section.");
        }

        var labels = new StackLabels();
        foreach (var (key, service) in services.Children)
        {
            var name = ((YamlScalarNode)key).Value ?? "";
            labels.Read(name, Labels(service, environment));
        }

        return labels.ToStackFile(services.Children.Count);
    }

    private static StackFile Failed(string error) => new(0, 0, [], [], [], [error]);

    private static YamlNode? Child(YamlMappingNode node, string key) =>
        node.Children.TryGetValue(new YamlScalarNode(key), out var child) ? child : null;

    private static Dictionary<string, string> Labels(YamlNode service, Func<string, string?> environment)
    {
        if (service is not YamlMappingNode mapping || Child(mapping, "deploy") is not YamlMappingNode deploy)
        {
            return new Dictionary<string, string>(StringComparer.Ordinal);
        }

        var pairs = Child(deploy, "labels") switch
        {
            YamlMappingNode map => map.Children.Select(c => (Scalar(c.Key), Scalar(c.Value))),
            YamlSequenceNode list => list.Children.Select(c => Split(Scalar(c))),
            _ => [],
        };
        var labels = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var (key, value) in pairs)
        {
            labels[key] = LabelInterpolation.Apply(value, environment);
        }

        return labels;
    }

    private static string Scalar(YamlNode node) => node is YamlScalarNode scalar ? scalar.Value ?? "" : "";

    private static (string Key, string Value) Split(string label)
    {
        var equals = label.IndexOf('=', StringComparison.Ordinal);
        return equals < 0 ? (label, "") : (label[..equals], label[(equals + 1)..]);
    }
}
