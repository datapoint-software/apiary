using System.Reflection;
using Datapoint.Apiary.Management.Backups;
using Datapoint.Apiary.Management.Certificates;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Architecture.Tests;

public sealed class AgentToolTests
{
    private static readonly IReadOnlyList<Type> s_actions =
        [.. typeof(UploadCertificate).Assembly.GetTypes().Where(type => type.GetCustomAttribute<ActionAttribute>() is not null)];

    public static TheoryData<string> SensitiveActions { get; } =
        [.. s_actions.Where(HandlesPrivateKeysOrBackups).Select(type => type.FullName!)];

    [Fact]
    public void Private_key_and_backup_actions_are_found() =>
        Assert.Superset(
            new HashSet<string>(StringComparer.Ordinal) { typeof(UploadCertificate).FullName!, typeof(ExportBackup).FullName!, typeof(RestoreBackup).FullName! },
            new HashSet<string>(SensitiveActions.Select(row => row.Data), StringComparer.Ordinal));

    [Theory]
    [MemberData(nameof(SensitiveActions))]
    public void Actions_handling_private_keys_or_backups_are_not_offered_to_agents(string action) =>
        Assert.Null(s_actions.Single(type => type.FullName == action).GetCustomAttribute<ModelContextProtocolAttribute>());

    private static bool HandlesPrivateKeysOrBackups(Type action) =>
        action.Name.Contains("Restore", StringComparison.Ordinal)
        || typeof(ICertificateUpload).IsAssignableFrom(action)
        || action.GetProperties().Any(property => property.Name.Contains("Key", StringComparison.Ordinal) && property.PropertyType == typeof(string))
        || action.GetInterfaces().Any(contract => contract.IsGenericType && contract.GetGenericArguments().Contains(typeof(BackupFile)));
}
