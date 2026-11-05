using Datapoint.Apiary.Cluster.State;
using FluentValidation;

namespace Datapoint.Apiary.Management.Stacks;

public sealed class CreatePipelineTokenValidator : AbstractValidator<CreatePipelineToken>
{
    public CreatePipelineTokenValidator(IClusterState cluster)
    {
        RuleFor(t => t.Name).PipelineTokenName(cluster);
        RuleFor(t => t.Days).PipelineTokenDays();
    }
}
