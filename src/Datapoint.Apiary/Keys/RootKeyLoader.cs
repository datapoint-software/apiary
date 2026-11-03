using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Hosting;
using Datapoint.Apiary.Security.Keys;
using Microsoft.Extensions.Options;

namespace Datapoint.Apiary.Keys;

public sealed partial class RootKeyLoader(IOptions<ApiaryOptions> options, IOptions<ClusterOptions> cluster, ILogger<RootKeyLoader> logger)
{
    private const string GeneratedFileName = "root-key";

    public RootKey Load()
    {
        var mounted = options.Value.RootKeyFile;
        if (File.Exists(mounted))
        {
            LogMounted(mounted);
            return Read(mounted);
        }

        if (cluster.Value.Mode is ClusterMode.Swarm)
        {
            throw new InvalidOperationException($"No root key is mounted at {mounted}. In Swarm, create one with `apiary secrets init | docker secret create apiary_root_key_1 -` and reference it in the stack file.");
        }

        var generated = Path.Combine(options.Value.KeyDirectory, GeneratedFileName);
        if (File.Exists(generated))
        {
            LogGenerated(generated, mounted);
            return Read(generated);
        }

        var key = RootKey.Generate();
        Write(generated, key);
        LogCreated(generated, mounted);
        return key;
    }

    private static RootKey Read(string path) =>
        RootKey.TryParse(File.ReadAllText(path))
        ?? throw new InvalidOperationException($"{path} isn't a root key. Make one with `apiary secrets init`.");

    private static void Write(string path, RootKey key)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(path))!);
        var fileOptions = new FileStreamOptions { Mode = FileMode.CreateNew, Access = FileAccess.Write };
        if (!OperatingSystem.IsWindows())
        {
            fileOptions.UnixCreateMode = UnixFileMode.UserRead | UnixFileMode.UserWrite;
        }

        using var stream = new FileStream(path, fileOptions);
        using var writer = new StreamWriter(stream);
        writer.Write(key.Format());
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Using the root key mounted at {Path}")]
    private partial void LogMounted(string path);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Using the root key Apiary generated at {Path}, because none is mounted at {Mounted}. Keep it on a different volume from the state, and mount one made with `apiary secrets init` in production.")]
    private partial void LogGenerated(string path, string mounted);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Generated a root key at {Path}, because none is mounted at {Mounted}. Back it up: without it the state can't be read. In production, mount one made with `apiary secrets init`.")]
    private partial void LogCreated(string path, string mounted);
}
