using System.Security.Claims;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Tests.Fakes;

public sealed class TestPrincipal : IPrincipalAccessor
{
    public ClaimsPrincipal? Principal { get; set; }
}
