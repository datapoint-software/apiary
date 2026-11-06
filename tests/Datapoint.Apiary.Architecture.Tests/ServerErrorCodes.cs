using System.Reflection;
using Datapoint.Apiary.Certificates.Acme;
using Datapoint.Apiary.Certificates.Dns;
using Datapoint.Apiary.Management.Errors;

namespace Datapoint.Apiary.Architecture.Tests;

public static class ServerErrorCodes
{
    public static TheoryData<string> All { get; } = [.. ErrorCodes.All.Concat(Constants(typeof(AcmeErrors))).Concat(Constants(typeof(DnsErrors)))];

    public static IReadOnlyList<string> Constants(Type type) =>
        [.. type.GetFields(BindingFlags.Public | BindingFlags.Static)
            .Where(field => field.IsLiteral && field.FieldType == typeof(string))
            .Select(field => (string)field.GetRawConstantValue()!)];
}
