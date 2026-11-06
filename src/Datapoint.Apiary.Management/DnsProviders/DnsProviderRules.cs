using System.Linq.Expressions;
using Datapoint.Apiary.Certificates.Dns;
using Datapoint.Apiary.Cluster.DnsProviders;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Certificates;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Validation;
using FluentValidation;

namespace Datapoint.Apiary.Management.DnsProviders;

public static class DnsProviderRules
{
    public const int MaximumName = 60;
    public const int MaximumDomains = 20;
    public const int MaximumSetting = 200;
    public const int MaximumSecret = 4096;

    public static void AddDnsProviderRules<T>(this AbstractValidator<T> validator, IClusterState cluster, Func<T, Guid?> existingId)
        where T : IDnsProviderFields
    {
        validator.RuleFor(p => p.Name).Cascade(CascadeMode.Stop)
            .Must(name => !string.IsNullOrWhiteSpace(name)).WithErrorCode(ErrorCodes.Required)
            .Must(name => name.Trim().Length <= MaximumName).WithErrorCode(ErrorCodes.TooLong)
            .Must((p, name) => !IsNameTaken(cluster.Current, name, existingId(p))).WithErrorCode(ErrorCodes.DnsProviderNameTaken);
        validator.RuleFor(p => p.Kind).IsInEnum().WithErrorCode(ErrorCodes.Invalid);
        validator.RuleFor(p => p.Domains).Cascade(CascadeMode.Stop)
            .Must(domains => domains is { Count: > 0 }).WithErrorCode(ErrorCodes.Required)
            .Must(domains => domains.Count <= MaximumDomains).WithErrorCode(ErrorCodes.DnsProviderDomainsTooMany)
            .Must(domains => domains.All(CertificateNames.IsHostname)).WithErrorCode(ErrorCodes.HostnameInvalid)
            .Must((p, domains) => !IsDomainTaken(cluster.Current, domains, existingId(p))).WithErrorCode(ErrorCodes.DnsProviderDomainTaken);
        validator.RuleFor(p => p.ChallengeZone!).Cascade(CascadeMode.Stop)
            .Must(CertificateNames.IsHostname).WithErrorCode(ErrorCodes.HostnameInvalid)
            .Must((p, zone) => !DnsProviderInput.Domains(p.Domains).Contains(DnsNames.Normalize(zone), StringComparer.Ordinal)).WithErrorCode(ErrorCodes.DnsProviderChallengeZoneOverlaps)
            .When(p => !string.IsNullOrWhiteSpace(p.ChallengeZone));
        validator.Setting(p => p.Server, DnsProviderKind.Rfc2136);
        validator.Setting(p => p.KeyName, DnsProviderKind.Rfc2136);
        validator.Setting(p => p.Tenant, DnsProviderKind.Azure);
        validator.Setting(p => p.ClientId, DnsProviderKind.Azure);
        validator.Setting(p => p.Subscription, DnsProviderKind.Azure);
        validator.Setting(p => p.ResourceGroup, DnsProviderKind.Azure);
        validator.Setting(p => p.AccessKey, DnsProviderKind.Route53);
        validator.RuleFor(p => p.Port!.Value).Port().When(p => p.Kind == DnsProviderKind.Rfc2136 && p.Port is not null);
        validator.RuleFor(p => p.Algorithm).Must(a => DnsTsig.Algorithms.Contains(a, StringComparer.Ordinal)).WithErrorCode(ErrorCodes.Invalid).When(p => p.Kind == DnsProviderKind.Rfc2136);
        validator.AddSecretRules(cluster, existingId);
    }

    private static void AddSecretRules<T>(this AbstractValidator<T> validator, IClusterState cluster, Func<T, Guid?> existingId)
        where T : IDnsProviderFields
    {
        Func<T, DnsProvider?> existing = p => existingId(p) is { } id ? cluster.Current.DnsProviders.GetValueOrDefault(id) : null;
        validator.Secret(p => p.Secret, DnsProviderKind.Rfc2136, existing);
        validator.Secret(p => p.Token, DnsProviderKind.Hetzner, existing);
        validator.Secret(p => p.Token, DnsProviderKind.Cloudflare, existing);
        validator.Secret(p => p.ClientSecret, DnsProviderKind.Azure, existing);
        validator.Secret(p => p.SecretKey, DnsProviderKind.Route53, existing);
        validator.RuleFor(p => p.Secret).Must(IsBase64).WithErrorCode(ErrorCodes.DnsProviderSecretInvalid)
            .When(p => p.Kind == DnsProviderKind.Rfc2136 && !string.IsNullOrWhiteSpace(p.Secret));
    }

    private static void Setting<T>(this AbstractValidator<T> validator, Expression<Func<T, string?>> field, DnsProviderKind kind)
        where T : IDnsProviderFields =>
        validator.RuleFor(field).Cascade(CascadeMode.Stop)
            .Must(value => !string.IsNullOrWhiteSpace(value)).WithErrorCode(ErrorCodes.Required)
            .Must(value => value!.Trim().Length <= MaximumSetting).WithErrorCode(ErrorCodes.TooLong)
            .When(p => p.Kind == kind);

    private static void Secret<T>(this AbstractValidator<T> validator, Expression<Func<T, string?>> field, DnsProviderKind kind, Func<T, DnsProvider?> existing)
        where T : IDnsProviderFields
    {
        var name = ((MemberExpression)field.Body).Member.Name;
        var key = char.ToLowerInvariant(name[0]) + name[1..];
        validator.RuleFor(field).Cascade(CascadeMode.Stop)
            .Must((p, value) => !string.IsNullOrWhiteSpace(value) || DnsProviderInput.Keeps(existing(p), kind, key)).WithErrorCode(ErrorCodes.Required)
            .Must(value => (value?.Trim().Length ?? 0) <= MaximumSecret).WithErrorCode(ErrorCodes.TooLong)
            .When(p => p.Kind == kind);
    }

    private static bool IsBase64(string? value) =>
        Convert.TryFromBase64String(value!.Trim(), new byte[value.Length], out var written) && written > 0;

    private static bool IsNameTaken(ApiaryState state, string name, Guid? except) =>
        state.DnsProviders.Values.Any(p => p.Id != except && string.Equals(p.Name, name.Trim(), StringComparison.OrdinalIgnoreCase));

    private static bool IsDomainTaken(ApiaryState state, IReadOnlyList<string> domains, Guid? except)
    {
        var wanted = DnsProviderInput.Domains(domains);
        return state.DnsProviders.Values.Any(p => p.Id != except && p.Domains.Intersect(wanted, StringComparer.Ordinal).Any());
    }
}
