namespace Datapoint.Apiary.Testing;

public sealed class TemporaryDirectory : IDisposable
{
    private readonly DirectoryInfo _directory = Directory.CreateTempSubdirectory("apiary-tests-");

    public string Path => _directory.FullName;

    public void Dispose() => _directory.Delete(recursive: true);
}
