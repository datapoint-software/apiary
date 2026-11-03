using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Backups;

[Action("backups.export", "Exports an encrypted backup of the whole configuration: projects, routes, certificates with their private keys, users and the audit log. Only a cluster with the same root key can open it.")]
[Api]
[RequiresRole(Role.Administrator)]
public sealed record ExportBackup : ICommand<BackupFile>;
