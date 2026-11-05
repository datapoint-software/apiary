using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;
using FluentValidation;

namespace Datapoint.Apiary.Management.Stacks;

public sealed class AddStackWithTokenValidator : AbstractValidator<AddStackWithToken>
{
    public AddStackWithTokenValidator(IClusterState cluster)
    {
        RuleFor(s => s.Name).Cascade(CascadeMode.Stop)
            .Must(name => !string.IsNullOrWhiteSpace(name)).WithErrorCode(ErrorCodes.Required)
            .Must(name => StackNames.IsStack(name.Trim())).WithErrorCode(ErrorCodes.StackNameInvalid)
            .Must(name => !cluster.Current.Stacks.ContainsKey(name.Trim())).WithErrorCode(ErrorCodes.StackExists);
        RuleFor(s => s.ProjectId)
            .Must(id => cluster.Current.Projects.ContainsKey(id!.Value)).WithErrorCode(ErrorCodes.ProjectNotFound).When(s => s.ProjectId is not null);
        RuleFor(s => s.TokenName).PipelineTokenName(cluster);
        RuleFor(s => s.TokenDays).PipelineTokenDays();
    }
}
