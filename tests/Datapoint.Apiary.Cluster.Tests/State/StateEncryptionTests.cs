using System.Text;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Security.Keys;
using Datapoint.Apiary.Testing;

namespace Datapoint.Apiary.Cluster.Tests.State;

public sealed class StateEncryptionTests : IDisposable
{
    private const string Purpose = "apiary/test";
    private readonly TemporaryDirectory _directory = new();
    private readonly RootKey _rootKey = RootKey.Generate();

    public void Dispose() => _directory.Dispose();

    [Fact]
    public async Task A_new_key_ring_seals_and_opens()
    {
        var encryption = await CreatedAsync();

        var opened = encryption.Open(Purpose, encryption.Seal(Purpose, "state"u8));

        Assert.Equal("state", Encoding.UTF8.GetString(opened));
    }

    [Fact]
    public async Task A_new_key_ring_is_loaded()
    {
        var encryption = await CreatedAsync();

        Assert.Equal((true, TestClock.Now), (encryption.IsLoaded, encryption.CurrentCreatedAt));
    }

    [Fact]
    public void An_encryption_without_a_key_ring_isn_t_loaded()
    {
        var encryption = new StateEncryption(_rootKey, TestClock.Fake());

        Assert.Equal((false, (DateTimeOffset?)null), (encryption.IsLoaded, encryption.CurrentCreatedAt));
    }

    [Fact]
    public async Task Loading_a_directory_without_a_key_ring_finds_none()
    {
        var encryption = new StateEncryption(_rootKey, TestClock.Fake());

        Assert.False(await encryption.LoadAsync(_directory.Path, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task A_saved_key_ring_loads_with_the_same_root_key()
    {
        var sealedText = (await CreatedAsync()).Seal(Purpose, "state"u8);
        var loaded = new StateEncryption(_rootKey, TestClock.Fake());

        await loaded.LoadAsync(_directory.Path, TestContext.Current.CancellationToken);

        Assert.Equal("state", Encoding.UTF8.GetString(loaded.Open(Purpose, sealedText)));
    }

    [Fact]
    public async Task A_saved_key_ring_doesn_t_load_with_another_root_key()
    {
        await CreatedAsync();
        var other = new StateEncryption(RootKey.Generate(), TestClock.Fake());

        await Assert.ThrowsAsync<WrongRootKeyException>(() => other.LoadAsync(_directory.Path, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Sealed_text_names_its_data_key()
    {
        var encryption = await CreatedAsync();

        Assert.StartsWith(encryption.Export().Current + ".", encryption.Seal(Purpose, "state"u8), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Sealed_text_doesn_t_open_for_another_purpose()
    {
        var encryption = await CreatedAsync();
        var sealedText = encryption.Seal(Purpose, "state"u8);

        Assert.Throws<InvalidDataException>(() => encryption.Open("apiary/other", sealedText));
    }

    [Fact]
    public async Task Text_sealed_with_an_unknown_data_key_doesn_t_open()
    {
        var encryption = await CreatedAsync();

        Assert.Throws<InvalidDataException>(() => encryption.Open(Purpose, "unknown.abc"));
    }

    [Fact]
    public async Task Text_without_a_data_key_doesn_t_open()
    {
        var encryption = await CreatedAsync();

        Assert.Throws<InvalidDataException>(() => encryption.Open(Purpose, "abc"));
    }

    [Fact]
    public async Task A_new_data_key_seals_from_then_on()
    {
        var encryption = await CreatedAsync();
        var key = StateEncryption.NewDataKey(TestClock.Now.AddDays(90));

        await encryption.AddAsync(key, TestContext.Current.CancellationToken);

        Assert.StartsWith(key.Id + ".", encryption.Seal(Purpose, "state"u8), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Text_sealed_before_a_new_data_key_still_opens()
    {
        var encryption = await CreatedAsync();
        var sealedText = encryption.Seal(Purpose, "state"u8);

        await encryption.AddAsync(StateEncryption.NewDataKey(TestClock.Now.AddDays(90)), TestContext.Current.CancellationToken);

        Assert.Equal("state", Encoding.UTF8.GetString(encryption.Open(Purpose, sealedText)));
    }

    [Fact]
    public async Task A_new_data_key_is_saved_with_the_key_ring()
    {
        var encryption = await CreatedAsync();
        var key = StateEncryption.NewDataKey(TestClock.Now.AddDays(90));
        await encryption.AddAsync(key, TestContext.Current.CancellationToken);
        var loaded = new StateEncryption(_rootKey, TestClock.Fake());

        await loaded.LoadAsync(_directory.Path, TestContext.Current.CancellationToken);

        Assert.Equal((key.Id, 2), (loaded.Export().Current, loaded.Export().Keys.Count));
    }

    [Fact]
    public async Task Adding_the_same_data_key_twice_keeps_one_copy()
    {
        var encryption = await CreatedAsync();
        var key = StateEncryption.NewDataKey(TestClock.Now.AddDays(90));

        await encryption.AddAsync(key, TestContext.Current.CancellationToken);
        await encryption.AddAsync(key, TestContext.Current.CancellationToken);

        Assert.Equal(2, encryption.Export().Keys.Count);
    }

    [Fact]
    public async Task Adding_a_data_key_before_loading_a_key_ring_fails()
    {
        var encryption = new StateEncryption(_rootKey, TestClock.Fake());

        await Assert.ThrowsAsync<InvalidOperationException>(() => encryption.AddAsync(StateEncryption.NewDataKey(TestClock.Now), TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task A_key_ring_shared_with_another_replica_opens_its_state()
    {
        var encryption = await CreatedAsync();
        var sealedText = encryption.Seal(Purpose, "state"u8);
        using var other = new TemporaryDirectory();
        var replica = new StateEncryption(RootKey.Generate(), TestClock.Fake());

        await replica.ImportAsync(other.Path, encryption.Export(), TestContext.Current.CancellationToken);

        Assert.Equal("state", Encoding.UTF8.GetString(replica.Open(Purpose, sealedText)));
    }

    [Fact]
    public async Task A_shared_key_that_isn_t_base64url_isn_t_imported()
    {
        var encryption = new StateEncryption(_rootKey, TestClock.Fake());
        var ring = new SharedKeyRing("bad", [new SharedDataKey("bad", TestClock.Now, "not*base64")]);

        await Assert.ThrowsAsync<InvalidDataException>(() => encryption.ImportAsync(_directory.Path, ring, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task The_key_ring_on_disk_doesn_t_contain_the_data_keys()
    {
        var encryption = await CreatedAsync();

        var file = await File.ReadAllTextAsync(Path.Combine(_directory.Path, "keys.json"), TestContext.Current.CancellationToken);

        Assert.DoesNotContain(encryption.Export().Keys[0].Key, file, StringComparison.Ordinal);
    }

    private async Task<StateEncryption> CreatedAsync()
    {
        var encryption = new StateEncryption(_rootKey, TestClock.Fake());
        await encryption.CreateAsync(_directory.Path, TestContext.Current.CancellationToken);
        return encryption;
    }
}
