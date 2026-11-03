using System.Security.Cryptography;
using System.Text;
using Datapoint.Apiary.Management.Accounts;

namespace Datapoint.Apiary.Accounts;

public sealed partial class PwnedPasswords(IHttpClientFactory clients, ILogger<PwnedPasswords> logger) : IBreachedPasswords
{
    public const string ClientName = "apiary.pwned";
    private const int PrefixLength = 5;

    [System.Diagnostics.CodeAnalysis.SuppressMessage("Security", "CA5350", Justification = "Have I Been Pwned's range API is keyed by SHA-1; only the first 5 characters of the hash leave Apiary.")]
    public async ValueTask<bool> IsBreachedAsync(string password, CancellationToken cancellationToken)
    {
        var hash = Convert.ToHexString(SHA1.HashData(Encoding.UTF8.GetBytes(password)));
        var prefix = hash[..PrefixLength];
        var suffix = hash[PrefixLength..];
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, new Uri($"range/{prefix}", UriKind.Relative));
            request.Headers.Add("Add-Padding", "true");
            using var response = await clients.CreateClient(ClientName).SendAsync(request, cancellationToken);
            response.EnsureSuccessStatusCode();
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            return IsListed(body, suffix);
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException)
        {
            LogUnavailable(logger, exception.Message);
            return false;
        }
    }

    private static bool IsListed(string body, string suffix)
    {
        foreach (var line in body.AsSpan().EnumerateLines())
        {
            var colon = line.IndexOf(':');
            if (colon == suffix.Length
                && line[..colon].Equals(suffix, StringComparison.OrdinalIgnoreCase)
                && !line[(colon + 1)..].Trim().SequenceEqual("0"))
            {
                return true;
            }
        }

        return false;
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "Couldn't check a new password against Have I Been Pwned, so it was accepted: {Reason}")]
    private static partial void LogUnavailable(ILogger logger, string reason);
}
