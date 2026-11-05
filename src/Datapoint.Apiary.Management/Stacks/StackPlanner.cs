using System.Globalization;
using Datapoint.Apiary.Cluster.Projects;
using Datapoint.Apiary.Cluster.Redirects;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.Stacks;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Cluster.Streams;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Projects;
using Datapoint.Apiary.Management.Routes;
using Datapoint.Apiary.Management.Streams;

namespace Datapoint.Apiary.Management.Stacks;

public sealed class StackPlanner(ApiaryState state, StackRecord stack, ApplyStackFile apply, DateTimeOffset now, string by)
{
    private const int DefaultTimeoutSeconds = 30;
    private readonly List<IStateChange> _removals = [];
    private readonly List<IStateChange> _saves = [];
    private readonly List<StackPlanItem> _added = [];
    private readonly List<StackPlanItem> _changed = [];
    private readonly List<StackPlanItem> _removed = [];
    private readonly Dictionary<string, Project> _newProjects = new(StringComparer.OrdinalIgnoreCase);

    public static StackPlanResult Plan(ApiaryState state, StackRecord stack, ApplyStackFile apply, DateTimeOffset now, string by) =>
        new StackPlanner(state, stack, apply, now, by).Plan();

    public static string RouteName(string host, string path) => path == "/" ? host : host + path;

    private StackPlanResult Plan()
    {
        if (HostInUse() is { } host)
        {
            return StackPlanResult.Refused(ErrorCodes.RouteHostInUse, "host", host);
        }

        if (PortInUse() is { } port)
        {
            return StackPlanResult.Refused(ErrorCodes.StreamPortTaken, "port", port);
        }

        var declared = apply.Routes.Count + apply.StreamRoutes.Count + apply.Redirects.Count;
        var existing = Declared(state.Routes.Values) + Declared(state.StreamRoutes.Values) + Declared(state.Redirects.Values);
        if (declared == 0 && existing > 0 && !apply.AllowRemovingAll)
        {
            return StackPlanResult.Refused(ErrorCodes.StackRemovesEverything, "count", existing);
        }

        PlanRoutes();
        PlanStreamRoutes();
        PlanRedirects();
        IStateChange[] projects = [.. _newProjects.Values.Select(p => new ProjectSaved(p))];
        return new StackPlanResult(new StackPlan(_added, _changed, _removed), [.. projects, .. _removals, .. _saves]);
    }

    private int Declared<T>(IEnumerable<T> items) => items.Count(item => SourceOf(item)?.Stack == stack.Name);

    private static StackSource? SourceOf<T>(T item) => item switch
    {
        Route route => route.Stack,
        StreamRoute stream => stream.Stack,
        Redirect redirect => redirect.Stack,
        _ => null,
    };

    private bool IsOther(StackSource? source) => source?.Stack != stack.Name;

    private string? HostInUse()
    {
        var hosts = apply.Routes.Select(r => r.Host).Concat(apply.Redirects.Select(r => r.From)).Select(RouteNormalization.Host);
        return hosts.FirstOrDefault(host =>
            state.Routes.Values.Any(r => r.Host == host && IsOther(r.Stack))
            || state.Redirects.Values.Any(r => r.From == host && IsOther(r.Stack)));
    }

    private int? PortInUse() =>
        apply.StreamRoutes
            .Where(d => state.StreamRoutes.Values.Any(s => s.Protocol == d.Protocol && s.ListenPort == d.ListenPort && IsOther(s.Stack)))
            .Select(d => (int?)d.ListenPort)
            .FirstOrDefault();

    private void PlanRoutes()
    {
        var existing = state.Routes.Values.Where(r => r.Stack?.Stack == stack.Name).ToDictionary(r => (r.Stack!.Service, r.Stack.Name));
        foreach (var declared in apply.Routes)
        {
            if (existing.Remove((declared.Service, declared.Name), out var route))
            {
                UpdateRoute(route, declared);
                continue;
            }

            AddRoute(declared);
        }

        foreach (var route in existing.Values)
        {
            _removals.Add(new RouteDeleted(route.Id));
            _removed.Add(new StackPlanItem(StackItemKind.Route, RouteName(route.Host, route.Path)));
        }
    }

    private void AddRoute(DeclaredRoute declared)
    {
        var host = RouteNormalization.Host(declared.Host);
        var path = RouteNormalization.Path(declared.Path);
        var route = new Route(
            Guid.CreateVersion7(now),
            ProjectFor(declared.Project, current: null),
            host,
            path,
            [Target(declared)],
            declared.TimeoutSeconds ?? DefaultTimeoutSeconds,
            CertificateId: null,
            now,
            by)
        {
            RateLimit = declared.RateLimit,
            Stack = RouteSource(declared),
        };
        _saves.Add(new RouteSaved(route));
        _added.Add(new StackPlanItem(StackItemKind.Route, RouteName(host, path)));
    }

    private void UpdateRoute(Route route, DeclaredRoute declared)
    {
        var target = Target(declared);
        var updated = route with
        {
            Host = RouteNormalization.Host(declared.Host),
            Path = RouteNormalization.Path(declared.Path),
            Targets = [target],
            ProjectId = declared.Project is null ? route.ProjectId : ProjectFor(declared.Project, route.ProjectId),
            TimeoutSeconds = declared.TimeoutSeconds ?? route.TimeoutSeconds,
            RateLimit = declared.RateLimit ?? route.RateLimit,
            Stack = RouteSource(declared),
        };
        var name = RouteName(updated.Host, updated.Path);
        var changes = new Comparison(StackItemKind.Route, name, route.Stack!, route.ChangedAt, route.ChangedBy, EditedSinceApply(route.ChangedAt))
            .Field(StackFields.Host, route.Host, updated.Host)
            .Field(StackFields.Path, route.Path, updated.Path)
            .Field(StackFields.Targets, Targets(route.Targets), Targets(updated.Targets))
            .Field(StackFields.Project, ProjectName(route.ProjectId), ProjectName(updated.ProjectId))
            .Field(StackFields.Timeout, Text(route.TimeoutSeconds), Text(updated.TimeoutSeconds))
            .Field(StackFields.RateLimit, Text(route.RateLimit), Text(updated.RateLimit))
            .Items;
        Save(changes, Differ(route.Stack, updated.Stack!), new RouteSaved(updated with { ChangedAt = now, ChangedBy = by }));
    }

    private void PlanStreamRoutes()
    {
        var existing = state.StreamRoutes.Values.Where(s => s.Stack?.Stack == stack.Name).ToDictionary(s => (s.Stack!.Service, s.Stack.Name));
        foreach (var declared in apply.StreamRoutes)
        {
            if (existing.Remove((declared.Service, declared.Name), out var stream))
            {
                UpdateStreamRoute(stream, declared);
                continue;
            }

            var added = new StreamRoute(
                Guid.CreateVersion7(now),
                ProjectFor(declared.Project, current: null),
                declared.Name,
                declared.Protocol,
                declared.ListenPort,
                StackNames.Target(stack.Name, declared.Service),
                declared.Port,
                [],
                StreamRules.DefaultIdleTimeoutSeconds,
                now,
                by)
            {
                Stack = StreamSource(declared),
            };
            _saves.Add(new StreamRouteSaved(added));
            _added.Add(new StackPlanItem(StackItemKind.StreamRoute, added.Name));
        }

        foreach (var stream in existing.Values)
        {
            _removals.Add(new StreamRouteDeleted(stream.Id));
            _removed.Add(new StackPlanItem(StackItemKind.StreamRoute, stream.Name));
        }
    }

    private void UpdateStreamRoute(StreamRoute stream, DeclaredStreamRoute declared)
    {
        var updated = stream with
        {
            Name = declared.Name,
            Protocol = declared.Protocol,
            ListenPort = declared.ListenPort,
            TargetHost = StackNames.Target(stack.Name, declared.Service),
            TargetPort = declared.Port,
            ServerNames = [],
            ProjectId = declared.Project is null ? stream.ProjectId : ProjectFor(declared.Project, stream.ProjectId),
            Stack = StreamSource(declared),
        };
        var changes = new Comparison(StackItemKind.StreamRoute, updated.Name, stream.Stack!, stream.ChangedAt, stream.ChangedBy, EditedSinceApply(stream.ChangedAt))
            .Field(StackFields.Protocol, stream.Protocol.ToString(), updated.Protocol.ToString())
            .Field(StackFields.Listen, Text(stream.ListenPort), Text(updated.ListenPort))
            .Field(StackFields.Target, $"{stream.TargetHost}:{Text(stream.TargetPort)}", $"{updated.TargetHost}:{Text(updated.TargetPort)}")
            .Field(StackFields.Project, ProjectName(stream.ProjectId), ProjectName(updated.ProjectId))
            .Items;
        Save(changes, Differ(stream.Stack, updated.Stack!), new StreamRouteSaved(updated with { ChangedAt = now, ChangedBy = by }));
    }

    private void PlanRedirects()
    {
        var existing = state.Redirects.Values.Where(r => r.Stack?.Stack == stack.Name).ToDictionary(r => (r.Stack!.Service, r.Stack.Name));
        foreach (var declared in apply.Redirects)
        {
            var redirect = new Redirect(
                Guid.CreateVersion7(now),
                ProjectFor(declared.Project, current: null),
                RouteNormalization.Host(declared.From),
                declared.To.Trim(),
                declared.StatusCode ?? 308,
                declared.KeepPath ?? true,
                now,
                by)
            {
                Stack = RedirectSource(declared),
            };
            if (existing.Remove((declared.Service, declared.Name), out var current))
            {
                UpdateRedirect(current, redirect with { Id = current.Id, ProjectId = declared.Project is null ? current.ProjectId : redirect.ProjectId });
                continue;
            }

            _saves.Add(new RedirectSaved(redirect));
            _added.Add(new StackPlanItem(StackItemKind.Redirect, redirect.From));
        }

        foreach (var redirect in existing.Values)
        {
            _removals.Add(new RedirectDeleted(redirect.Id));
            _removed.Add(new StackPlanItem(StackItemKind.Redirect, redirect.From));
        }
    }

    private void UpdateRedirect(Redirect current, Redirect updated)
    {
        var changes = new Comparison(StackItemKind.Redirect, updated.From, current.Stack!, current.ChangedAt, current.ChangedBy, edited: false)
            .Field(StackFields.From, current.From, updated.From)
            .Field(StackFields.To, current.To, updated.To)
            .Field(StackFields.StatusCode, Text(current.StatusCode), Text(updated.StatusCode))
            .Field(StackFields.KeepPath, current.KeepPath ? "true" : "false", updated.KeepPath ? "true" : "false")
            .Field(StackFields.Project, ProjectName(current.ProjectId), ProjectName(updated.ProjectId))
            .Items;
        Save(changes, Differ(current.Stack, updated.Stack!), new RedirectSaved(updated));
    }

    private void Save(IReadOnlyList<StackPlanItem> changes, bool sourceChanged, IStateChange save)
    {
        _changed.AddRange(changes);
        if (changes.Count == 0 && !sourceChanged)
        {
            return;
        }

        _saves.Add(save);
    }

    private static bool Differ(StackSource? before, StackSource after) =>
        before is null || before.Service != after.Service || before.Name != after.Name || !before.Fields.SequenceEqual(after.Fields, StringComparer.Ordinal);

    private bool EditedSinceApply(DateTimeOffset changedAt) => stack.LastApply is not { } last || changedAt > last.At;

    private RouteTarget Target(DeclaredRoute declared) => new(StackNames.Target(stack.Name, declared.Service), declared.Port, 100);

    private StackSource RouteSource(DeclaredRoute declared) => new(stack.Name, declared.Service, declared.Name, [
        StackFields.Host, StackFields.Path, StackFields.Targets,
        .. Set(declared.Project is not null, StackFields.Project),
        .. Set(declared.TimeoutSeconds is not null, StackFields.Timeout),
        .. Set(declared.RateLimit is not null, StackFields.RateLimit)]);

    private StackSource StreamSource(DeclaredStreamRoute declared) => new(stack.Name, declared.Service, declared.Name, [
        StackFields.Name, StackFields.Protocol, StackFields.Listen, StackFields.Target, StackFields.Port,
        .. Set(declared.Project is not null, StackFields.Project)]);

    private StackSource RedirectSource(DeclaredRedirect declared) => new(stack.Name, declared.Service, declared.Name, [
        StackFields.From, StackFields.To, StackFields.StatusCode, StackFields.KeepPath,
        .. Set(declared.Project is not null, StackFields.Project)]);

    private static IEnumerable<string> Set(bool isSet, string field) => isSet ? [field] : [];

    private Guid ProjectFor(string? name, Guid? current)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return current ?? stack.ProjectId ?? DefaultProject();
        }

        var trimmed = name.Trim();
        var known = state.Projects.Values.FirstOrDefault(p => string.Equals(p.Name, trimmed, StringComparison.OrdinalIgnoreCase));
        if (known is not null)
        {
            return known.Id;
        }

        if (_newProjects.TryGetValue(trimmed, out var project))
        {
            return project.Id;
        }

        var created = new Project(Guid.CreateVersion7(now), trimmed, "", ProjectIcons.Default);
        _newProjects[trimmed] = created;
        return created.Id;
    }

    private Guid DefaultProject() =>
        stack.ProjectId is { } id && state.Projects.ContainsKey(id)
            ? id
            : state.Projects.Values.OrderBy(p => p.Id).First().Id;

    private string ProjectName(Guid id) =>
        state.Projects.TryGetValue(id, out var project) ? project.Name : _newProjects.Values.First(p => p.Id == id).Name;

    private static string Targets(IReadOnlyList<RouteTarget> targets) => string.Join(", ", targets.Select(t => $"{t.Host}:{Text(t.Port)}"));

    private static string Text(int value) => value.ToString(CultureInfo.InvariantCulture);

    private static string Text(int? value) => value is { } number ? Text(number) : "";

    private sealed class Comparison(StackItemKind kind, string name, StackSource before, DateTimeOffset changedAt, string? changedBy, bool edited)
    {
        private readonly List<StackPlanItem> _items = [];

        public IReadOnlyList<StackPlanItem> Items => _items;

        public Comparison Field(string field, string from, string to)
        {
            if (string.Equals(from, to, StringComparison.Ordinal))
            {
                return this;
            }

            var replaced = edited && !before.Sets(field);
            _items.Add(new StackPlanItem(kind, name)
            {
                Field = field,
                From = from,
                To = to,
                ReplacedBy = replaced ? changedBy : null,
                ReplacedAt = replaced ? changedAt : null,
            });
            return this;
        }
    }
}
