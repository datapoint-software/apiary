using Datapoint.Apiary.Commands;
using Datapoint.Apiary.Health;
using Datapoint.Apiary.Hosting;

if (args is ["health"])
{
    return await HealthCommand.RunAsync();
}

if (args is ["secrets", "init"])
{
    return SecretsInitCommand.Run();
}

if (args is ["users", "create-admin", .. var options])
{
    return await CreateAdminCommand.RunAsync(options);
}

if (args is ["recover", .. var recoverOptions])
{
    return await RecoverCommand.RunAsync(recoverOptions);
}

if (args is ["apply", .. var applyOptions])
{
    return await ApplyCommand.RunAsync(applyOptions);
}

var builder = WebApplication.CreateBuilder(args);
builder.AddApiaryListeners();
builder.Services.AddApiary(builder.Configuration);

var app = builder.Build();
app.UseApiary();
await app.RunAsync();
return 0;
