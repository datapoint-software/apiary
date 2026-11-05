using System.ComponentModel;
using Datapoint.Apiary.Cluster.Streams;

namespace Datapoint.Apiary.Management.Stacks;

public sealed record DeclaredStreamRoute(
    [property: Description("The stream route's name in its labels, such as mqtt in apiary.stream.mqtt.listen.")] string Name,
    [property: Description("The service in the stack file that declares it.")] string Service,
    [property: Description("Tcp or Udp.")] StreamProtocol Protocol,
    [property: Description("The port Apiary listens on.")] int ListenPort,
    [property: Description("The service's port.")] int Port,
    [property: Description("The name of the project it belongs to, or null for the stack's project.")] string? Project = null);
