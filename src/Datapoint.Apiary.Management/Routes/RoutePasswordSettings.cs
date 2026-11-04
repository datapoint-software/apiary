using System.ComponentModel;

namespace Datapoint.Apiary.Management.Routes;

public sealed record RoutePasswordSettings(
    [property: Description("A new password, from 12 to 128 characters, or null to keep the current one. Required when the route doesn't ask for a password yet. A new password signs out every visitor.")] string? NewPassword = null,
    [property: Description("How many days visitors stay signed in on their browser: 1, 7 or 30.")] int Days = 7,
    [property: Description("A message on the password page, at most 120 characters. Anyone who opens the address sees it, so name nothing private.")] string? Message = null,
    [property: Description("Whether a sign-in link opens the site without typing the password. Turning it off makes the current link stop working.")] bool Link = false,
    [property: Description("A new key for the sign-in link, made of at least 16 random bytes in base64url (22 characters or more), or null to keep the current link. The link is https://<host><path>?apiary-key=<key>. Apiary keeps only a hash of the key.")] string? NewLinkKey = null);
