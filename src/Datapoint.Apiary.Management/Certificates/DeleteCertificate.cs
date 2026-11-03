using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Certificates;

[Action("certificates.delete", Description = "Deletes a certificate and its private key from every replica. Refused while a route uses it.")]
[RequiresRole(Role.Operator)]
public sealed record DeleteCertificate([property: Description("The certificate's id.")] Guid Id) : ICommand;
