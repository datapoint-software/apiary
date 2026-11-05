using System.Globalization;
using Datapoint.Apiary.Cluster.Streams;
using Datapoint.Apiary.Management.Stacks;

namespace Datapoint.Apiary.Stacks;

public sealed class StackLabels
{
    public const string Prefix = "apiary.";
    private static readonly string[] s_routeSettings = ["host", "port", "path", "timeout", "rate-limit", "project"];
    private static readonly string[] s_streamSettings = ["protocol", "listen", "port", "project"];
    private static readonly string[] s_redirectSettings = ["from", "path", "to", "status", "keep-path", "project"];
    private readonly List<DeclaredRoute> _routes = [];
    private readonly List<DeclaredStreamRoute> _streams = [];
    private readonly List<DeclaredRedirect> _redirects = [];
    private readonly List<string> _errors = [];
    private int _labels;

    public void Read(string service, IReadOnlyDictionary<string, string> labels)
    {
        var groups = new Dictionary<(string Kind, string Name), Dictionary<string, string>>();
        string? project = null;
        foreach (var (key, value) in labels)
        {
            if (!key.StartsWith(Prefix, StringComparison.Ordinal))
            {
                continue;
            }

            _labels++;
            if (key == Prefix + "project")
            {
                project = value;
                continue;
            }

            if (Parse(key) is not { } label)
            {
                _errors.Add($"{service}: {key} isn't an Apiary label. Use apiary.project, apiary.route.<name>.<setting>, apiary.stream.<name>.<setting> or apiary.redirect.<name>.<setting>.");
                continue;
            }

            groups.TryAdd((label.Kind, label.Name), new Dictionary<string, string>(StringComparer.Ordinal));
            groups[(label.Kind, label.Name)][label.Setting] = value;
        }

        foreach (var ((kind, name), settings) in groups)
        {
            Declare(service, kind, name, settings, project);
        }
    }

    public StackFile ToStackFile(int services) => new(services, _labels, _routes, _streams, _redirects, _errors);

    private static (string Kind, string Name, string Setting)? Parse(string key)
    {
        var parts = key[Prefix.Length..].Split('.');
        return parts is [var kind and ("route" or "stream" or "redirect"), var name, var setting] && name.Length > 0
            ? (kind, name, setting)
            : null;
    }

    private void Declare(string service, string kind, string name, Dictionary<string, string> settings, string? project)
    {
        var label = $"{service}: apiary.{kind}.{name}";
        var known = kind switch
        {
            "route" => s_routeSettings,
            "stream" => s_streamSettings,
            _ => s_redirectSettings,
        };
        var unknown = settings.Keys.Where(s => !known.Contains(s, StringComparer.Ordinal)).ToList();
        if (unknown.Count > 0)
        {
            _errors.AddRange(unknown.Select(s => $"{label}.{s} isn't a setting Apiary reads from labels. It reads {string.Join(", ", known)}."));
            return;
        }

        var reader = new Settings(label, settings, _errors);
        var projectName = settings.GetValueOrDefault("project") ?? project;
        switch (kind)
        {
            case "route":
                DeclareRoute(service, name, reader, projectName);
                break;
            case "stream":
                DeclareStream(service, name, reader, projectName);
                break;
            default:
                DeclareRedirect(service, name, reader, projectName);
                break;
        }
    }

    private void DeclareRoute(string service, string name, Settings settings, string? project)
    {
        var host = settings.Required("host");
        var port = settings.Number("port", required: true);
        if (host is null || port is null)
        {
            return;
        }

        _routes.Add(new DeclaredRoute(name, service, host, port.Value, settings.Optional("path") ?? "/", project, settings.Number("timeout"), settings.Number("rate-limit")));
    }

    private void DeclareStream(string service, string name, Settings settings, string? project)
    {
        var protocol = settings.Optional("protocol")?.ToLowerInvariant() switch
        {
            null or "tcp" => StreamProtocol.Tcp,
            "udp" => StreamProtocol.Udp,
            _ => settings.Fail<StreamProtocol?>("protocol", "is tcp or udp"),
        };
        var listen = settings.Number("listen", required: true);
        var port = settings.Number("port", required: true);
        if (protocol is null || listen is null || port is null)
        {
            return;
        }

        _streams.Add(new DeclaredStreamRoute(name, service, protocol.Value, listen.Value, port.Value, project));
    }

    private void DeclareRedirect(string service, string name, Settings settings, string? project)
    {
        var from = settings.Required("from");
        var to = settings.Required("to");
        var keepPath = settings.Optional("keep-path")?.ToLowerInvariant() switch
        {
            null => (bool?)null,
            "true" => true,
            "false" => false,
            _ => settings.Fail<bool?>("keep-path", "is true or false"),
        };
        if (from is null || to is null)
        {
            return;
        }

        _redirects.Add(new DeclaredRedirect(name, service, from, to, project, settings.Number("status"), keepPath, settings.Optional("path")));
    }

    private sealed class Settings(string label, Dictionary<string, string> values, List<string> errors)
    {
        public string? Optional(string setting) => values.TryGetValue(setting, out var value) && value.Trim().Length > 0 ? value.Trim() : null;

        public string? Required(string setting) => Optional(setting) ?? Fail<string>(setting, "is required");

        public int? Number(string setting, bool required = false)
        {
            if (Optional(setting) is not { } text)
            {
                return required ? Fail<int?>(setting, "is required") : null;
            }

            return int.TryParse(text, NumberStyles.None, CultureInfo.InvariantCulture, out var number) ? number : Fail<int?>(setting, "is a whole number");
        }

        public T? Fail<T>(string setting, string reason)
        {
            errors.Add($"{label}.{setting} {reason}.");
            return default;
        }
    }
}
