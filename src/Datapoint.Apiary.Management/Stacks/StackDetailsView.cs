namespace Datapoint.Apiary.Management.Stacks;

public sealed record StackDetailsView(StackView Stack, IReadOnlyList<DeclaredItemView> Items, IReadOnlyList<PipelineTokenView> Tokens);
