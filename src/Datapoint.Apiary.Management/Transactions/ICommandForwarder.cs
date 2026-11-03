using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Transactions;

public interface ICommandForwarder
{
    ValueTask ForwardAsync(ICommand command, CancellationToken cancellationToken);

    ValueTask<TResult> ForwardAsync<TResult>(ICommand<TResult> command, CancellationToken cancellationToken);

    string? Serialize<TResult>(TResult result);
}
