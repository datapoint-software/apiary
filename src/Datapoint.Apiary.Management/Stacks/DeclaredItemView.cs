using Datapoint.Apiary.Cluster.Stacks;
using Datapoint.Apiary.Cluster.Streams;

namespace Datapoint.Apiary.Management.Stacks;

public sealed record DeclaredItemView(StackItemKind Kind, Guid Id, string Name, string Service, StreamProtocol? Protocol = null, int? ListenPort = null);
