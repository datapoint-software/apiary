using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Certificates;

[Action("certificates.upload", Description = "Adds an uploaded certificate with its private key, or replaces one. For the admin UI only, so private keys never pass through an agent.")]
[RequiresRole(Role.Operator)]
public sealed record UploadCertificate(
    [property: Description("The id of the project the certificate belongs to.")] Guid ProjectId,
    [property: Description("The certificate and its chain, PEM, leaf first.")] string ChainPem,
    [property: Description("The private key, PEM, without a passphrase.")] string KeyPem,
    [property: Description("The uploaded certificate this replaces, if any. Routes using it switch to the new one.")] Guid? ReplacingId = null)
    : ICommand<Guid>, ICertificateUpload;
