using System.Net;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Security.Network;
using FluentValidation;

namespace Datapoint.Apiary.Management.Validation;

public static class RuleExtensions
{
    public static IRuleBuilderOptions<T, string> Hostname<T>(this IRuleBuilderInitial<T, string> rule) =>
        rule.Cascade(CascadeMode.Stop)
            .NotEmpty().WithErrorCode(ErrorCodes.HostnameRequired)
            .Must(HostnameRules.HasNoScheme).WithErrorCode(ErrorCodes.HostnameScheme)
            .Must(HostnameRules.HasNoPath).WithErrorCode(ErrorCodes.HostnamePath)
            .Must(HostnameRules.IsNotAddress).WithErrorCode(ErrorCodes.HostnameAddress)
            .MaximumLength(HostnameRules.MaximumLength).WithErrorCode(ErrorCodes.HostnameTooLong)
            .Must(HostnameRules.IsFull).WithErrorCode(ErrorCodes.HostnameNotFull)
            .Must(HostnameRules.HasNoConsecutiveDots).WithErrorCode(ErrorCodes.HostnameConsecutiveDots)
            .Must(HostnameRules.HasOnlyAllowedCharacters).WithErrorCode(ErrorCodes.HostnameLabel)
            .Must(HostnameRules.HasValidLabels).WithErrorCode(ErrorCodes.HostnameLabel);

    public static IRuleBuilderOptions<T, string> Target<T>(this IRuleBuilderInitial<T, string> rule) =>
        rule.Cascade(CascadeMode.Stop)
            .NotEmpty().WithErrorCode(ErrorCodes.TargetRequired)
            .Must(TargetRules.HasNoPort).WithErrorCode(ErrorCodes.TargetPort)
            .Must(host => TargetRules.Classify(host) is not AddressKind.Loopback).WithErrorCode(ErrorCodes.TargetLoopback)
            .Must(host => TargetRules.Classify(host) is not AddressKind.LinkLocal).WithErrorCode(ErrorCodes.TargetLinkLocal)
            .Must(host => TargetRules.Classify(host) is not AddressKind.Unspecified).WithErrorCode(ErrorCodes.TargetUnspecified)
            .Must(host => TargetRules.IsAddress(host) || IsHostname(host)).WithErrorCode(ErrorCodes.TargetInvalid);

    public static IRuleBuilderOptions<T, int> Port<T>(this IRuleBuilder<T, int> rule) =>
        rule.InclusiveBetween(1, 65535).WithErrorCode(ErrorCodes.Range);

    public static IRuleBuilderOptions<T, string> Path<T>(this IRuleBuilderInitial<T, string> rule) =>
        rule.Cascade(CascadeMode.Stop)
            .NotEmpty().WithErrorCode(ErrorCodes.Required)
            .Must(IsPath).WithErrorCode(ErrorCodes.PathInvalid);

    public static IRuleBuilderOptions<T, string> IpRange<T>(this IRuleBuilder<T, string> rule) =>
        rule.Must(IsIpRange).WithErrorCode(ErrorCodes.IpRangeInvalid);

    private static bool IsHostname(string host) =>
        host.Length <= HostnameRules.MaximumLength
        && HostnameRules.HasOnlyAllowedCharacters(host)
        && HostnameRules.HasNoConsecutiveDots(host)
        && HostnameRules.HasValidLabels(host)
        && !host.StartsWith('.');

    private static bool IsPath(string path)
    {
        var hasForbidden = path.Contains('?', StringComparison.Ordinal) || path.Contains('#', StringComparison.Ordinal)
            || path.Contains("..", StringComparison.Ordinal) || path.Contains("//", StringComparison.Ordinal);
        return path.StartsWith('/') && path.Length <= 1024 && !hasForbidden && !path.Any(char.IsWhiteSpace);
    }

    public static bool IsIpRange(string value) =>
        IPNetwork.TryParse(value, out _) || IPAddress.TryParse(value, out _);
}
