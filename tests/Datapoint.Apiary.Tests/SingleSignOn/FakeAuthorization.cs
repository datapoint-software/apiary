namespace Datapoint.Apiary.Tests.SingleSignOn;

internal sealed record FakeAuthorization(string RedirectUri, string Nonce, string Challenge, IReadOnlyDictionary<string, object?> Claims);
