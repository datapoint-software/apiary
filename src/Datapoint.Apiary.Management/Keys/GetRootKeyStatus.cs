using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Keys;

[Action("keys.status", Description = "Shows which root key each replica uses, and how far a root key rotation has got. Keys are shown by their ID, never their value.")]
[RequiresRole(Role.Administrator)]
public sealed record GetRootKeyStatus : IQuery<RootKeyStatus>;
