using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Tests.Fakes;

public sealed class NoForwarding : ICommandForwarder
{
    public IList<object> Forwarded { get; } = [];

    public ValueTask ForwardAsync(ICommand command, CancellationToken cancellationToken)
    {
        Forwarded.Add(command);
        return ValueTask.CompletedTask;
    }

    public ValueTask<TResult> ForwardAsync<TResult>(ICommand<TResult> command, CancellationToken cancellationToken)
    {
        Forwarded.Add(command);
        return ValueTask.FromResult(default(TResult)!);
    }

    public string? Serialize<TResult>(TResult result) => result?.ToString();
}
