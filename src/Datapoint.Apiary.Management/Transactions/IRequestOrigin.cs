namespace Datapoint.Apiary.Management.Transactions;

public interface IRequestOrigin
{
    string? Address { get; }

    string? Client { get; }
}
