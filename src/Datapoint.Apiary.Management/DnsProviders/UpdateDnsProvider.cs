using System.ComponentModel;
using Datapoint.Apiary.Cluster.DnsProviders;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.DnsProviders;

[Action("dns-providers.update", "Changes a DNS provider, then tests it again. Credentials left empty keep their current value.")]
[Api]
[RequiresRole(Role.Administrator)]
public sealed record UpdateDnsProvider(
    [property: Description("The provider's id.")] Guid Id,
    [property: Description("A name to tell providers apart, such as Office DNS. At most 60 characters.")] string Name,
    [property: Description("Rfc2136 for your own DNS server, or Hetzner, Cloudflare, Azure or Route53.")] DnsProviderKind Kind,
    [property: Description("The zones this provider holds, such as example.com, at most 20. Each proves every hostname under it. A domain can have only one provider.")] IReadOnlyList<string> Domains,
    [property: Description("A separate zone where the records are written instead, such as acme.example.net, with a CNAME from each _acme-challenge name. Recommended: the credentials then reach only challenge records.")] string? ChallengeZone = null,
    [property: Description("RFC 2136: the primary server that accepts updates, a hostname or address.")] string? Server = null,
    [property: Description("RFC 2136: the server's port. 53 if empty.")] int? Port = null,
    [property: Description("RFC 2136: the TSIG key's name.")] string? KeyName = null,
    [property: Description("RFC 2136: hmac-sha256 or hmac-sha512.")] string? Algorithm = null,
    [property: Description("RFC 2136: the TSIG secret, in Base64. Leave it empty to keep the current one.")] string? Secret = null,
    [property: Description("Hetzner and Cloudflare: the API token. Leave it empty to keep the current one.")] string? Token = null,
    [property: Description("Azure: the tenant ID.")] string? Tenant = null,
    [property: Description("Azure: the service principal's client ID.")] string? ClientId = null,
    [property: Description("Azure: the client secret. Leave it empty to keep the current one.")] string? ClientSecret = null,
    [property: Description("Azure: the subscription ID.")] string? Subscription = null,
    [property: Description("Azure: the resource group that holds the zones.")] string? ResourceGroup = null,
    [property: Description("Route 53: the access key ID.")] string? AccessKey = null,
    [property: Description("Route 53: the secret access key. Leave it empty to keep the current one.")] string? SecretKey = null)
    : ICommand<DnsProviderSaveResult>, IDnsProviderFields;
