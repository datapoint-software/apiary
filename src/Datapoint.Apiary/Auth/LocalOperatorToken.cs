using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Security.Tokens;
using Microsoft.Extensions.Options;

namespace Datapoint.Apiary.Auth;

public sealed class LocalOperatorToken(IOptions<ClusterOptions> options)
{
    public const string FileName = "operator-token";

    public string Value { get; } = SecretTokens.New();

    public static string PathIn(string dataDirectory) => Path.Combine(dataDirectory, FileName);

    public async Task WriteAsync(CancellationToken ct)
    {
        var path = PathIn(options.Value.DataDirectory);
        Directory.CreateDirectory(options.Value.DataDirectory);
        File.Delete(path);
        var fileOptions = new FileStreamOptions { Mode = FileMode.CreateNew, Access = FileAccess.Write };
        if (!OperatingSystem.IsWindows())
        {
            fileOptions.UnixCreateMode = UnixFileMode.UserRead | UnixFileMode.UserWrite;
        }

        await using var stream = new FileStream(path, fileOptions);
        await using var writer = new StreamWriter(stream);
        await writer.WriteAsync(Value.AsMemory(), ct);
    }
}
