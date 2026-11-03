using System.Text.Json;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Security.Keys;
using Datapoint.Apiary.Security.Tokens;

namespace Datapoint.Apiary.Cluster.Backups;

public sealed class BackupSealer(RootKey rootKey)
{
    private const string Prefix = "apiary-backup-1:";
    private const string Purpose = "apiary/backup";
    private readonly SealedTokens _tokens = new(new SealingKey(rootKey.Derive(KeyPurposes.Backups)));

    public string Seal(BackupContent content) =>
        Prefix + _tokens.Seal(Purpose, JsonSerializer.SerializeToUtf8Bytes(content, ClusterJsonContext.Default.BackupContent));

    public BackupContent? Open(string text)
    {
        var trimmed = text.Trim();
        if (!trimmed.StartsWith(Prefix, StringComparison.Ordinal) || _tokens.Open(Purpose, trimmed[Prefix.Length..]) is not { } json)
        {
            return null;
        }

        var content = JsonSerializer.Deserialize(json, ClusterJsonContext.Default.BackupContent);
        return content is { Version: BackupContent.CurrentVersion } ? content : null;
    }
}
