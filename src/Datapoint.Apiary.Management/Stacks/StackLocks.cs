using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Routes;
using Datapoint.Apiary.Management.Streams;
using FluentValidation;
using FluentValidation.Results;

namespace Datapoint.Apiary.Management.Stacks;

public static class StackLocks
{
    public static void AddRouteLocks(this AbstractValidator<UpdateRoute> validator, IClusterState cluster) =>
        validator.RuleFor(r => r).Custom((command, context) =>
        {
            if (!cluster.Current.Routes.TryGetValue(command.Id, out var route) || route.Stack is not { } source)
            {
                return;
            }

            var targets = RouteNormalization.Targets(command.Targets);
            Lock(context, source.Sets(StackFields.Host) && RouteNormalization.Host(command.Host) != route.Host, nameof(UpdateRoute.Host), ErrorCodes.RouteDeclaredInStack);
            Lock(context, source.Sets(StackFields.Path) && RouteNormalization.Path(command.Path) != route.Path, nameof(UpdateRoute.Path), ErrorCodes.RouteDeclaredInStack);
            Lock(context, source.Sets(StackFields.Targets) && !targets.SequenceEqual(route.Targets), nameof(UpdateRoute.Targets), ErrorCodes.RouteDeclaredInStack);
            Lock(context, source.Sets(StackFields.Project) && command.ProjectId != route.ProjectId, nameof(UpdateRoute.ProjectId), ErrorCodes.RouteDeclaredInStack);
            Lock(context, source.Sets(StackFields.Timeout) && command.TimeoutSeconds != route.TimeoutSeconds, nameof(UpdateRoute.TimeoutSeconds), ErrorCodes.RouteDeclaredInStack);
            Lock(context, source.Sets(StackFields.RateLimit) && command.RateLimit != route.RateLimit, nameof(UpdateRoute.RateLimit), ErrorCodes.RouteDeclaredInStack);
        });

    public static void AddStreamLocks(this AbstractValidator<UpdateStreamRoute> validator, IClusterState cluster) =>
        validator.RuleFor(s => s).Custom((command, context) =>
        {
            if (!cluster.Current.StreamRoutes.TryGetValue(command.Id, out var stream) || stream.Stack is null)
            {
                return;
            }

            Lock(context, command.Name.Trim() != stream.Name, nameof(UpdateStreamRoute.Name), ErrorCodes.StreamDeclaredInStack);
            Lock(context, command.Protocol != stream.Protocol, nameof(UpdateStreamRoute.Protocol), ErrorCodes.StreamDeclaredInStack);
            Lock(context, command.ListenPort != stream.ListenPort, nameof(UpdateStreamRoute.ListenPort), ErrorCodes.StreamDeclaredInStack);
            Lock(context, !string.Equals(command.TargetHost.Trim(), stream.TargetHost, StringComparison.OrdinalIgnoreCase), nameof(UpdateStreamRoute.TargetHost), ErrorCodes.StreamDeclaredInStack);
            Lock(context, command.TargetPort != stream.TargetPort, nameof(UpdateStreamRoute.TargetPort), ErrorCodes.StreamDeclaredInStack);
            Lock(context, stream.Stack.Sets(StackFields.Project) && command.ProjectId != stream.ProjectId, nameof(UpdateStreamRoute.ProjectId), ErrorCodes.StreamDeclaredInStack);
        });

    private static void Lock<T>(ValidationContext<T> context, bool changed, string field, string code)
    {
        if (!changed)
        {
            return;
        }

        context.AddFailure(new ValidationFailure(field, code) { ErrorCode = code });
    }
}
