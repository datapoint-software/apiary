using System.Text.Json.Serialization;

namespace Datapoint.Apiary.Management.Accounts;

[JsonSourceGenerationOptions(UseStringEnumConverter = true)]
[JsonSerializable(typeof(Challenge))]
public sealed partial class AccountsJsonContext : JsonSerializerContext;
