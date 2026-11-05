using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;
using FluentValidation;

namespace Datapoint.Apiary.Management.Stacks;

public static class PipelineTokenRules
{
    public static IRuleBuilderOptions<T, string> PipelineTokenName<T>(this IRuleBuilderInitial<T, string> rule, IClusterState cluster) =>
        rule.Cascade(CascadeMode.Stop)
            .Must(name => !string.IsNullOrWhiteSpace(name)).WithErrorCode(ErrorCodes.Required)
            .Must(name => StackNames.IsLabel(name.Trim())).WithErrorCode(ErrorCodes.Invalid)
            .Must(name => !PipelineTokens.IsNameTaken(cluster.Current, name)).WithErrorCode(ErrorCodes.PipelineTokenNameTaken);

    public static IRuleBuilderOptions<T, int> PipelineTokenDays<T>(this IRuleBuilderInitial<T, int> rule) =>
        rule.Must(days => PipelineTokens.Days.Contains(days)).WithErrorCode(ErrorCodes.Invalid);
}
