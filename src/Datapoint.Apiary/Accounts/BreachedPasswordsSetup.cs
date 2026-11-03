using Datapoint.Apiary.Management.Accounts;

namespace Datapoint.Apiary.Accounts;

public static class BreachedPasswordsSetup
{
    public static IServiceCollection AddBreachedPasswords(this IServiceCollection services, bool enabled)
    {
        if (!enabled)
        {
            services.AddSingleton<IBreachedPasswords, NoBreachCheck>();
            return services;
        }

        services.AddHttpClient(PwnedPasswords.ClientName, client =>
        {
            client.BaseAddress = new Uri("https://api.pwnedpasswords.com/");
            client.Timeout = TimeSpan.FromSeconds(5);
            client.DefaultRequestHeaders.UserAgent.ParseAdd("Apiary");
        });
        services.AddSingleton<IBreachedPasswords, PwnedPasswords>();
        return services;
    }
}
