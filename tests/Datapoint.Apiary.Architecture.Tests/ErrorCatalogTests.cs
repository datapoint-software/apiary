using Datapoint.Apiary.Agents;
using Datapoint.Apiary.Management.Errors;

namespace Datapoint.Apiary.Architecture.Tests;

public sealed class ErrorCatalogTests
{
    [Fact]
    public void Every_error_code_constant_is_listed_in_All() =>
        Assert.Equal(
            ServerErrorCodes.Constants(typeof(ErrorCodes)).Order(StringComparer.Ordinal),
            ErrorCodes.All.Order(StringComparer.Ordinal),
            StringComparer.Ordinal);

    [Fact]
    public void Error_codes_are_unique() =>
        Assert.Equal(ErrorCodes.All.Count, ErrorCodes.All.Distinct(StringComparer.Ordinal).Count());

    [Theory]
    [MemberData(nameof(ServerErrorCodes.All), MemberType = typeof(ServerErrorCodes))]
    public void Every_error_code_has_an_English_message_in_the_UI(string code) =>
        Assert.Contains(code, MessageCatalog.English);

    [Theory]
    [MemberData(nameof(ServerErrorCodes.All), MemberType = typeof(ServerErrorCodes))]
    public void Every_error_code_has_a_Portuguese_message_in_the_UI(string code) =>
        Assert.Contains(code, MessageCatalog.Portuguese);

    [Theory]
    [MemberData(nameof(ServerErrorCodes.All), MemberType = typeof(ServerErrorCodes))]
    public void Every_error_code_has_a_description_for_agents(string code) =>
        Assert.Contains(code, McpErrorDescriptions.Codes, StringComparer.Ordinal);
}
