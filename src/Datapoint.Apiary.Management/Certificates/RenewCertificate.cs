using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Certificates;

[Action("certificates.renew", Description = "Requests a new automatic certificate from Let's Encrypt now, instead of waiting for the renewal window, and waits for the result. The current certificate keeps working if it fails.")]
[RequiresRole(Role.Operator)]
public sealed record RenewCertificate([property: Description("The automatic certificate's id.")] Guid Id) : ICommand<RenewResult>;
