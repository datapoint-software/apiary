using Datapoint.Apiary.Security.Keys;

namespace Datapoint.Apiary.Commands;

public static class SecretsInitCommand
{
    public static int Run()
    {
        Console.Out.WriteLine(RootKey.Generate().Format());
        return 0;
    }
}
