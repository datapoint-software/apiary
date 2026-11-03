namespace Datapoint.Apiary.Management.Accounts;

public interface ISessionCookie
{
    void Issue(string token);

    void Clear();
}
