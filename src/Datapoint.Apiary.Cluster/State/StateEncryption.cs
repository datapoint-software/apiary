using System.Text.Json;
using Datapoint.Apiary.Security.Keys;
using Datapoint.Apiary.Security.Tokens;

namespace Datapoint.Apiary.Cluster.State;

public sealed class StateEncryption(RootKey rootKey, TimeProvider time)
{
    private const int KeyRingVersion = 1;
    private const string FileName = "keys.json";
    private const char Separator = '.';
    private readonly SealedTokens _wrapping = new(new SealingKey(rootKey.Derive(KeyPurposes.StateAtRest)));
    private Dictionary<string, (DateTimeOffset CreatedAt, byte[] Key, SealedTokens Tokens)> _dataKeys = new(StringComparer.Ordinal);
    private string _current = "";
    private string? _directory;

    public bool IsLoaded => _current.Length > 0;

    public DateTimeOffset? CurrentCreatedAt => IsLoaded ? _dataKeys[_current].CreatedAt : null;

    public static SharedDataKey NewDataKey(DateTimeOffset now) => new(SecretTokens.New()[..8], now, Base64Url.Encode(SealingKey.Generate().Value));

    public async Task<bool> LoadAsync(string directory, CancellationToken cancellationToken)
    {
        var path = Path.Combine(directory, FileName);
        if (!File.Exists(path))
        {
            return false;
        }

        await using var stream = File.OpenRead(path);
        var ring = await JsonSerializer.DeserializeAsync(stream, ClusterJsonContext.Default.StateKeyRing, cancellationToken)
            ?? throw new InvalidDataException($"An empty key ring in {path}.");
        _dataKeys = ring.Keys.ToDictionary(k => k.Id, k => Use(k.CreatedAt, Unwrap(k)), StringComparer.Ordinal);
        _current = ring.Current;
        _directory = directory;
        return true;
    }

    public Task CreateAsync(string directory, CancellationToken cancellationToken)
    {
        var key = NewDataKey(time.GetUtcNow());
        return ImportAsync(directory, new SharedKeyRing(key.Id, [key]), cancellationToken);
    }

    public async Task ImportAsync(string directory, SharedKeyRing shared, CancellationToken cancellationToken)
    {
        var keys = shared.Keys.ToDictionary(k => k.Id, k => Use(k.CreatedAt, Base64Url.TryDecode(k.Key) ?? throw new InvalidDataException("A shared data key isn't base64url.")), StringComparer.Ordinal);
        var ring = new StateKeyRing(KeyRingVersion, shared.Current, [.. keys.Select(k => new WrappedDataKey(k.Key, k.Value.CreatedAt, _wrapping.Seal(WrapPurpose(k.Key), k.Value.Key)))]);
        var path = Path.Combine(directory, FileName);
        var temporary = path + ".tmp";
        await using (var stream = new FileStream(temporary, FileMode.Create, FileAccess.Write))
        {
            await JsonSerializer.SerializeAsync(stream, ring, ClusterJsonContext.Default.StateKeyRing, cancellationToken);
            stream.Flush(flushToDisk: true);
        }

        File.Move(temporary, path, overwrite: true);
        _dataKeys = keys;
        _current = shared.Current;
        _directory = directory;
    }

    public Task AddAsync(SharedDataKey key, CancellationToken cancellationToken)
    {
        var ring = Export();
        return ImportAsync(
            _directory ?? throw new InvalidOperationException("The key ring isn't loaded."),
            new SharedKeyRing(key.Id, [.. ring.Keys.Where(k => k.Id != key.Id), key]),
            cancellationToken);
    }

    public SharedKeyRing Export() =>
        new(_current, [.. _dataKeys.Select(k => new SharedDataKey(k.Key, k.Value.CreatedAt, Base64Url.Encode(k.Value.Key)))]);

    public string Seal(string purpose, ReadOnlySpan<byte> plaintext) =>
        _current + Separator + _dataKeys[_current].Tokens.Seal(purpose, plaintext);

    public byte[] Open(string purpose, string sealedText)
    {
        var separator = sealedText.IndexOf(Separator, StringComparison.Ordinal);
        if (separator <= 0 || !_dataKeys.TryGetValue(sealedText[..separator], out var key))
        {
            throw new InvalidDataException("The state was encrypted with a data key that isn't in the key ring.");
        }

        return key.Tokens.Open(purpose, sealedText[(separator + 1)..])
            ?? throw new InvalidDataException("The state can't be decrypted: it was changed, or encrypted with another root key.");
    }

    private static (DateTimeOffset CreatedAt, byte[] Key, SealedTokens Tokens) Use(DateTimeOffset createdAt, byte[] key) =>
        (createdAt, key, new SealedTokens(new SealingKey(key)));

    private static string WrapPurpose(string id) => "apiary/state-data-key/" + id;

    private byte[] Unwrap(WrappedDataKey wrapped) =>
        _wrapping.Open(WrapPurpose(wrapped.Id), wrapped.Key)
            ?? throw new InvalidDataException("The state's data keys can't be decrypted with this root key. Mount the root key this cluster was created with.");
}
