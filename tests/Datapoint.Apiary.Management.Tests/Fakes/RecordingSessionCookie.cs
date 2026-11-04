using Datapoint.Apiary.Management.Accounts;

namespace Datapoint.Apiary.Management.Tests.Fakes;

public sealed class RecordingSessionCookie : ISessionCookie
{
    public string? Token { get; private set; }

    public bool Cleared { get; private set; }

    public void Issue(string token) => Token = token;

    public void Clear()
    {
        Token = null;
        Cleared = true;
    }
}
