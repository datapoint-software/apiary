using System.Text.Json;
using Datapoint.Apiary.Security.Keys;
using Datapoint.Apiary.Security.Tokens;

namespace Datapoint.Apiary.Cluster.State;

public sealed class StateEncryption(RootKey rootKey, TimeProvider time)
{
    private const int KeyRingVersion = 1;
    private const char Separator = '.';
    private readonly SealedTokens _wrapping = new(new SealingKey(rootKey.Derive(KeyPurposes.StateAtRest)));
    private Dictionary<string, SealedTokens> _dataKeys = new(StringComparer.Ordinal);
    private string _current = "";

    public async Task LoadAsync(string directory, CancellationToken cancellationToken)
    {
        var path = Path.Combine(directory, "keys.json");
        var ring = File.Exists(path) ? await ReadAsync(path, cancellationToken) : await CreateAsync(path, cancellationToken);
        _dataKeys = ring.Keys.ToDictionary(k => k.Id, Unwrap, StringComparer.Ordinal);
        _current = ring.Current;
    }

    public string Seal(string purpose, ReadOnlySpan<byte> plaintext) =>
        _current + Separator + _dataKeys[_current].Seal(purpose, plaintext);

    public byte[] Open(string purpose, string sealedText)
    {
        var separator = sealedText.IndexOf(Separator, StringComparison.Ordinal);
        if (separator <= 0 || !_dataKeys.TryGetValue(sealedText[..separator], out var key))
        {
            throw new InvalidDataException("The state was encrypted with a data key that isn't in the key ring.");
        }

        return key.Open(purpose, sealedText[(separator + 1)..])
            ?? throw new InvalidDataException("The state can't be decrypted: it was changed, or encrypted with another root key.");
    }

    private static async Task<StateKeyRing> ReadAsync(string path, CancellationToken cancellationToken)
    {
        await using var stream = File.OpenRead(path);
        return await JsonSerializer.DeserializeAsync(stream, ClusterJsonContext.Default.StateKeyRing, cancellationToken)
            ?? throw new InvalidDataException($"An empty key ring in {path}.");
    }

    private static string WrapPurpose(string id) => "apiary/state-data-key/" + id;

    private async Task<StateKeyRing> CreateAsync(string path, CancellationToken cancellationToken)
    {
        var id = SecretTokens.New()[..8];
        var key = SealingKey.Generate();
        var ring = new StateKeyRing(KeyRingVersion, id, [new WrappedDataKey(id, time.GetUtcNow(), _wrapping.Seal(WrapPurpose(id), key.Value))]);
        var temporary = path + ".tmp";
        await using (var stream = new FileStream(temporary, FileMode.Create, FileAccess.Write))
        {
            await JsonSerializer.SerializeAsync(stream, ring, ClusterJsonContext.Default.StateKeyRing, cancellationToken);
            stream.Flush(flushToDisk: true);
        }

        File.Move(temporary, path, overwrite: false);
        return ring;
    }

    private SealedTokens Unwrap(WrappedDataKey wrapped) =>
        new(new SealingKey(_wrapping.Open(WrapPurpose(wrapped.Id), wrapped.Key)
            ?? throw new InvalidDataException("The state's data keys can't be decrypted with this root key. Mount the root key this cluster was created with.")));
}
