using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Account;

[Action("account.set-language", "Sets the language of your admin interface: en for English or pt-PT for European Portuguese.")]
[Api]
[RequiresRole(Role.Viewer)]
public sealed record SetLanguage(
    [property: Description("en or pt-PT.")] string Language) : ICommand;
