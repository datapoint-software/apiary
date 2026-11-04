using System.Globalization;

namespace Datapoint.Apiary.Tests.Hosting;

internal sealed class OperatorShell : IDisposable
{
    private const string AdminPortVariable = "Apiary__AdminPort";
    private const string DataDirectoryVariable = "Apiary__DataDirectory";

    private readonly TextWriter _previousOut = Console.Out;
    private readonly TextWriter _previousError = Console.Error;
    private readonly TextReader _previousIn = Console.In;
    private readonly StringWriter _out = new(CultureInfo.InvariantCulture);
    private readonly StringWriter _error = new(CultureInfo.InvariantCulture);
    private readonly StringReader _in;

    public OperatorShell(int adminPort, string dataDirectory, string typed = "")
    {
        _in = new StringReader(typed);
        Environment.SetEnvironmentVariable(AdminPortVariable, adminPort.ToString(CultureInfo.InvariantCulture));
        Environment.SetEnvironmentVariable(DataDirectoryVariable, dataDirectory);
        Console.SetOut(_out);
        Console.SetError(_error);
        Console.SetIn(_in);
    }

    public string Output => _out.ToString();

    public string Error => _error.ToString();

    public void Dispose()
    {
        Console.SetOut(_previousOut);
        Console.SetError(_previousError);
        Console.SetIn(_previousIn);
        Environment.SetEnvironmentVariable(AdminPortVariable, null);
        Environment.SetEnvironmentVariable(DataDirectoryVariable, null);
        _out.Dispose();
        _error.Dispose();
        _in.Dispose();
    }
}
