using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Cluster.Streams;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Validation;
using FluentValidation;

namespace Datapoint.Apiary.Management.Streams;

public static class StreamRules
{
    public const int MaximumName = 40;
    public const int MaximumServerNames = 20;
    public const int DefaultIdleTimeoutSeconds = 60;
    public const int MaximumIdleTimeoutSeconds = 3600;

    public static void AddStreamRules<T>(this AbstractValidator<T> validator, IClusterState cluster, StreamPortPolicy ports, Func<T, Guid?> existingId)
        where T : IStreamFields
    {
        validator.RuleFor(s => s.ProjectId)
            .Must(id => cluster.Current.Projects.ContainsKey(id)).WithErrorCode(ErrorCodes.ProjectNotFound);
        validator.RuleFor(s => s.Name).Cascade(CascadeMode.Stop)
            .Must(name => !string.IsNullOrWhiteSpace(name)).WithErrorCode(ErrorCodes.Required)
            .Must(name => name.Trim().Length <= MaximumName).WithErrorCode(ErrorCodes.TooLong);
        validator.RuleFor(s => s.Protocol).IsInEnum().WithErrorCode(ErrorCodes.Invalid);
        validator.RuleFor(s => s.ListenPort).Cascade(CascadeMode.Stop)
            .Port()
            .Must(port => !ports.Reserved.Contains(port)).WithErrorCode(ErrorCodes.StreamPortReserved)
            .Must((s, _) => Clash(cluster.Current, s, existingId(s)) is null).WithErrorCode(ErrorCodes.StreamPortTaken);
        validator.RuleFor(s => s.TargetHost).Target();
        validator.RuleFor(s => s.TargetPort).Port();
        validator.RuleFor(s => s.ServerNames).Cascade(CascadeMode.Stop)
            .Must((s, names) => s.Protocol is StreamProtocol.Tcp || names is not { Count: > 0 }).WithErrorCode(ErrorCodes.StreamServerNamesUdp)
            .Must(names => names is null || names.Count <= MaximumServerNames).WithErrorCode(ErrorCodes.StreamServerNamesTooMany);
        validator.RuleForEach(s => s.ServerNames).Must(IsServerName).WithErrorCode(ErrorCodes.HostnameInvalid);
        validator.RuleFor(s => s.IdleTimeoutSeconds)
            .InclusiveBetween(1, MaximumIdleTimeoutSeconds).When(s => s.Protocol is StreamProtocol.Udp).WithErrorCode(ErrorCodes.Range);
    }

    public static bool IsServerName(string name)
    {
        var trimmed = name.Trim().ToLowerInvariant();
        var host = trimmed.StartsWith("*.", StringComparison.Ordinal) ? trimmed[2..] : trimmed;
        return host.Length is > 0 and <= HostnameRules.MaximumLength
            && HostnameRules.IsFull(host)
            && HostnameRules.HasOnlyAllowedCharacters(host)
            && HostnameRules.HasNoConsecutiveDots(host)
            && HostnameRules.HasValidLabels(host);
    }

    public static StreamRoute? Clash(ApiaryState state, IStreamFields fields, Guid? except)
    {
        var names = StreamNormalization.ServerNames(fields);
        return state.StreamRoutes.Values.FirstOrDefault(other =>
            other.Id != except
            && other.Protocol == fields.Protocol
            && other.ListenPort == fields.ListenPort
            && (fields.Protocol is StreamProtocol.Udp
                || (names.Count == 0 && other.ServerNames.Count == 0)
                || names.Intersect(other.ServerNames, StringComparer.Ordinal).Any()));
    }
}
